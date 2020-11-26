class Evt {
  constructor() {
    Object.defineProperty(this, 'listeners', {
      value: new Map(),
      iterable: false
    })
  }

  on(evtName, fn, scope) {
    if (typeof evtName !== 'string') return
    if (!evtName) return
    let existingListeners = this.listeners.get(evtName)
    if (!existingListeners) {
      existingListeners = new Map()
      this.listeners.set(evtName, existingListeners)
    } 
    existingListeners.set(fn, {fn: fn, scope: scope})
  }

  /*
   * this does not fire the event
   */
  once(evtName, fn, scope) {
    if (typeof evtName !== 'string') return
    if (!evtName) return
    let existingListeners = this.listeners.get(evtName)
    if (!existingListeners) {
      existingListeners = new Map()
      this.listeners.set(evtName, existingListeners)
    } 
    existingListeners.set(fn, {scope: scope, once: true})
  }

  un(evtName, fn, scope) {
    if (typeof evtName !== 'string') return
    if (!evtName) return
    const existingListeners = this.listeners.get(evtName)
    if (existingListeners) {
      existingListeners.delete(fn)
    }
  }
  
  /*
   * delete all events with the evtName
   * or delets all events if evtName is boolean:true
   */
  purge(evtName) {
    if (typeof evtName === 'string') {
      if (evtName) {
        this.listeners.delete(evtName)
      }
    } else if (evtName === true) {
      this.listeners.clear()
    }
  }

  /*
   * look through all events and delete anything with a matching scope
   */
  purgeScope(scope) {
    if (!scope) return

    for (const [evtName, evtMap] of this.listeners.entries()) {
      if (evtMap.size) {
        let remaining = evtMap.size
        for (const [key, value] of evtMap.entries()) {
          if (value.scope === scope) {
            evtMap.delete(key)
            remaining--
          }
        }
        if (!remaining) {
          this.listeners.delete(evtName)
        }
      }
    }
  }

  fire(evtName, payload, scope) {
    if (typeof evtName !== 'string') return
    if (!evtName) return

    const existingListeners = this.listeners.get(evtName)
    if (!existingListeners) return

    for (const [evtFn, evtOb] of existingListeners.entries()) {
      if (typeof scope !== 'undefined') {
        evtFn.call(scope, payload)
      } else if (evtOb.scope) {
        evtFn.call(evtOb.scope, payload)
      } else {
        evtFn.call(this, payload)
      }
      if (evtOb.once) {
        existingListeners.delete(evtFn) 
      }
    }
    if (!existingListeners.size) {
      this.listeners.delete(evtName)
    }
  }
}

export default Evt
