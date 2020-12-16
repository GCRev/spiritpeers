import React from 'react'

class ContactEditDisplay extends React.PureComponent {
  constructor(data) {
    super()
    this.formRef = React.createRef()
    this.cancelHandler = this.cancelHandler.bind(this)
    this.saveHandler = this.saveHandler.bind(this)
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  cancelHandler() {
    this.props.contact.cancelUpsert()
  }

  saveHandler() {
    const inputs = this.formRef.current.querySelectorAll('input')
    const params = {}
    const editableProps = this.props.contact.getEditableProperties()

    /* 
     * this is shitty code, but they are 1-to-1 mapped so they should never
     * have a misalignment issue
     */
    for (let a = 0; a < inputs.length; a++) {
      const input = inputs[a]
      const editableProp = editableProps[a]
      const result = {
        prop: editableProp.prop,
        value: input.value
      }
      params[editableProp.prop] = result
    }
    this.props.contact.saveUpsert(params)
  }

  render() {
    return (
      <div className="contact-edit">
        <div className="title">{`${this.props.existingContact ? 'Edit' : 'New'} - ${this.props.contact.getTitle()}`}</div>
        <form ref={this.formRef} className="grid-form">
          <label 
            className="form-label"
          >UUID: </label>
          <div
            className="form-input disabled" 
          >{this.props.contact.uuid}</div>
          {
            this.props.contact.getEditableProperties().map((item, index) => {
              return (
                <React.Fragment key={`ced-lbl-${index}`}> 
                  <label 
                    className="form-label"
                  >{`${item.title}:  `}</label>
                  <input 
                    className="form-input" 
                    type="text"
                    defaultValue={item.value}
                  ></input>
                </React.Fragment> 
              )
            })
          }
        </form>
        <div className="flex-bar">
          <button className="form-button cancel" onClick={this.cancelHandler}>CANCEL</button>
          <button className="form-button" onClick={this.saveHandler}>SAVE</button>
        </div>
      </div>
    )
  }
}

export default ContactEditDisplay
