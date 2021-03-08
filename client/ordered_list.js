const { Evt } = require('./evt.js')

class OrderedObjectList extends Evt {
  constructor(args={}, ...items) {
    super()
    Object.defineProperty(this, 'length', {
      get() {
        return this.items.length
      },
      set() {
        // do nothing idiot
      }
    })
    this.items = []
    this.proxies = []

    Object.assign(this, args)
    if (!args.keyName)
      throw Error('A keyname is required')
    // requires a key to check each item in array for

    if (items) {
      this.add(...items)
    }
  }

  at(index) {
    return this.items[index]
  }

  first() {
    return this.items[0]
  }

  last() {
    return this.items[this.items.length - 1]
  }

  map(fn) {
    return this.items.map(fn)
  }

  all() {
    return this.items
  }

  next(item) {
    const foundItem = this.find(item) 
    if (foundItem && foundItem.item) {
      if (foundItem.index < this.items.length - 1) {
        return this.items[foundItem.index + 1]
      }
    }
  }

  previous(item) {
    const foundItem = this.find(item) 
    if (foundItem && foundItem.item) {
      if (foundItem.index > 0) {
        return this.items[foundItem.index - 1]
      }
    }
  }
  
  get(keyValue) {
    // finds the item by its ts value

    const find = function(start, end) {
      const mid = start + Math.floor((end - start) / 2)
      if (start === end) {
        return mid
      } else {
        const midVal = this.items[mid][this.keyName] 
        if (keyValue <= midVal) {
          return find.call(this, start, mid)
        } else if (keyValue > midVal) {
          return find.call(this, mid + 1, end)
        }
      }
    }
    if (!this.items.length || keyValue < this.items[0][this.keyName]) {
      return {index: 0}
    } else if (keyValue > this.items[this.items.length - 1][this.keyName]) {
      return {index: this.items.length}
    } else if (keyValue <= this.items[this.items.length - 1][this.keyName] &&
      keyValue >= this.items[0][this.keyName]) {
      const result = find.call(this, 0, this.items.length - 1)
      const item = this.items[result]
      return {index: result, item: item[this.keyName] === keyValue ? this.items[result] : undefined}
    } 
  }

  getAll(keyValue) {
    /*
     * gets multiple potential items with the same timestamp
     * items are in order ascending because they are always
     * sorted on add
     * get(keyValue) could find any one of multiple items with the same key
     *   - linearly iterate forwards and backwards until a different keyValue is found
    
     * if this key is defined then entries are guaranteed to be unique
     * and therefore ignore all of the other checks
     */

    const searchResult = this.get(keyValue)
    if (this.uniqueItems) {
      return [searchResult]
    }

    let result = []
    if (!searchResult.item) {
      return result
    } else {
      let startInd = searchResult.index
      let endInd = searchResult.index
      for (let a = searchResult.index; a >= 0; a--) {
        let item = this.items[a]
        if (item[this.keyName] !== keyValue) {
          startInd = a + 1
          break
        } else if (a === 0) {
          startInd = a
        }
      }
      for (let a = searchResult.index; a < this.items.length; a++) {
        let item = this.items[a]
        if (item[this.keyName] !== keyValue) {
          endInd = a - 1
          break
        } else if (a === this.items.length - 1) {
          endInd = a
        }
      }
      for (let a = startInd; a <= endInd; a++) {
        result.push({
          index: a,
          item: this.items[a]
        })
      }
      return result
    }

  }

  getRange(startVal, endVal) {
    /* this is inclusive */

    if (!this.items.length) {
      return []
    }

    if (isNaN(startVal)) 
      startVal = 0
    if (isNaN(endVal))
      endVal = this.items[this.items.length - 1].ts + 1
    const searchResultStart = this.get(startVal)
    const searchResultEnd = this.get(endVal)
    
    let result = []
    for (let a = searchResultStart.index; a < searchResultEnd.index; a++) {
      result.push({
        index: a,
        item: this.items[a]
      })
    }
    /* inclusive, check if an item was found at this index and add it */
    if (searchResultEnd.item) {
      result.push(searchResultEnd)
    }

    return result
  }

  find(item) {
    if (isNaN(item[this.keyName])) {
      return  
    }
    const itemResults = this.getAll(item[this.keyName]) 
    if (this.uniqueItems) {
      if (itemResults.length) {
        return itemResults[0]
      } else {
        return 
      }
    }

    let foundResult
    for (let a = itemResults.length - 1; a >= 0; a--) {
      const itemResult = itemResults[a]
      if (itemResult.item === item) {
        foundResult = itemResult
        break
      }
    }
    return foundResult
  }

  add(...items) {
    let result = []
    if (items) { 
      for (const item of items) {
        if (isNaN(item[this.keyName])) {
          continue
        }
        if (this.uniqueItems) {
          const itemResult = this.get(item[this.keyName])
          if (itemResult &&
            !itemResult.item) {
            this.items.splice(itemResult.index, 0, item)
            result.push(item)
          }
        } else {
          const itemResults = this.getAll(item[this.keyName]) 
          let found = false
          for (const itemResult of itemResults) {
            if (itemResult.item === item) {
              found = true
              break
            }
          }
          let index = 0
          if (!itemResults[0]) {
            index = this.get(item[this.keyName]).index
          } else {
            index = itemResults[0].index + 1
          }

          if (!found) {
            this.items.splice(index, 0, item)
            result.push(item)
          }
        }
      }
      if (result.length) {
        this.fire('add', result)
        for (const proxy of this.proxies) {
          proxy.add(...result)
        }
      }
    }
    return result
  }

  remove(...items) {
    let result = []
    if (items) {
      for (const item of items) {
        if (isNaN(item[this.keyName])) {
          continue
        }
        if (this.uniqueItems) {
          const itemResult = this.get(item[this.keyName])
          if (itemResult && 
            itemResult.item === item) {
            result.push(this.items.splice(itemResult.index, 1)[0])
          }
        } else {
          const itemResults = this.getAll(item[this.keyName]) 
          if (itemResults.length) {
            for (let a = itemResults.length - 1; a >= 0; a--) {
              const itemResult = itemResults[a]
              if (itemResult.item === item) {
                result.push(this.items.splice(itemResult.index, 1)[0])
              }
            }
          }
        }
      }
    }
    if (result.length) {
      this.fire('remove', result)
      for (const proxy of this.proxies) {
        proxy.remove(...result)
      }
    }
    return result
  }

  removeRange(startVal, endVal) {
    let removed = []
    if (!isNaN(startVal)) {
      if (isNaN(endVal)) {
        endVal = startVal
      }
      const itemResults = this.getRange(startVal, endVal) 
      if (itemResults.length) {
        for (let a = itemResults.length - 1; a >= 0; a--) {
          const itemResult = itemResults[a]
          const result = this.items.splice(itemResult.index, 1)
          Array.prototype.push.apply(removed, result)
        }
      }
    }
    if (removed.length) {
      this.fire('removerange', removed)
    }
    if (removed.length) {
      for (const proxy of this.proxies) {
        for (const result of removed) {
          proxy.remove(result)
        }
      }
    }
    return removed
  }

  move(item, newValue) {
    if (item) {
      let foundResult = this.find(item)
      if (foundResult) {
        this.items.splice(foundResult.index, 1)
        const oldValue = item[this.keyName]
        item[this.keyName] = newValue
        const newResult = this.get(newValue)
        this.items.splice(newResult.index + (newResult.item ? 1 : 0), 0, item)
        this.fire('move', {
          item: item,
          oldValue: oldValue,
          newValue: newValue
        })
      }
    }
  }

  clear() {
    const items = this.items.slice()
    this.items = []
    this.fire('clear', items)
    return items 
  }
}

exports.OrderedObjectList = OrderedObjectList
