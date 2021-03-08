const { SpiritClient } = require('spirit-client')
const assert = require('assert').strict

const spiritClient = new SpiritClient({
  uuid: process.env.UUID
})

function randomString(len = 12) {
  let result = ''
  for (let a = 0; a < len; a++) {
    result += String.fromCharCode(33 + Math.round(Math.random() * 94))
  }
  return result
}

const username = process.env.USR || randomString()
const password = process.env.PASS || randomString()
const targetUuid = process.env.TARG || spiritClient.generateHilariousRandomIdentifier()

console.log(`username: ${username}\npassword: ${password}`)

async function prep() {
  await spiritClient.logon(username, password)
  const newContact = spiritClient.upsertContact(targetUuid)
  await spiritClient.confirmUpsertContact(newContact)
  return { newContact }
}

async function test_messaging_basic() {
  const { newContact } = await prep()
  await newContact.talkTo()

  const randomMessages = []

  /* send a ton of messages to stress-test the log queueing system */
  for (let a = 0; a < 2; a++) {
    randomMessages.push(`test message _${randomString()}_`)
  }

  for (let a = 0; a < randomMessages.length; a++) {
    let ts = spiritClient.now()
    await newContact.message(randomMessages[a], ts)
  }
  
}

async function test_log_file() {
  await prep()
  await spiritClient.purgeLogFile()

  const randomMessages = []

  const date = new Date()
  date.setHours(0)
  date.setMinutes(0)
  date.setSeconds(0)

  const numDays = 3
  const messagesPerDay = 2

  for (let day = 0; day < numDays; day++) {
    /* 86400 seconds per day * 1000 ms */
    let newDateTs = date.valueOf() + (86400 * 1000 * day)
    for (let a = 0; a < messagesPerDay; a++) {
      randomMessages.push({ entryTs: newDateTs, ts: spiritClient.now() + (day * messagesPerDay + a), md: `test message _${randomString()}_` })
    }
  }

  /* "log" two messages per day for several days */

  for (let a = 0; a < randomMessages.length; a++) {
    const { entryTs, ts, md } = randomMessages[a]
    await spiritClient.writeToLogFile({
      uuid: targetUuid,
      outgoing: true,
      ts,
      entryTs,
      flags: { offline: true }, 
      md
    })
  }

  await spiritClient.indexLogFile()

  /* 
   * there should be an equal number of markers as there are days
   * remember - there is always a marker at position 0
   */
  assert.equal(numDays, spiritClient.transactions.markers.length)

  /*
   * read the log file but only the messages on the first day
   */
  await spiritClient.readLogFile(spiritClient.transactions.markers.first().offset, spiritClient.transactions.markers.at(1).offset)

  assert.equal(messagesPerDay, spiritClient.transactions.history.length)

}

async function run() {
  try {
    await test_log_file()
    process.exit(1)
  } catch (err) {
    console.log(err)
  }
}

run()
