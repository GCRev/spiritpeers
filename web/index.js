/* poll the webserver for number of clients
 * don't use a websocket because I'm too lazy to separate websockets from
 * the desktop app and the website into two servers
 */

const ind = document.getElementById('ind')

function heartbeat() {
  const req = new XMLHttpRequest()
  req.open('GET', 'clients')
  req.addEventListener('load', () => {
    try {
      const rjson = JSON.parse(req.response)
      ind.innerText = rjson.count
    } catch (err) {
      /* do nothing */
    }
  })
  req.send()
  setTimeout(heartbeat, 5000)
}

heartbeat()
