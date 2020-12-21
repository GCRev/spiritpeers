import React from 'react'
import { Icon, ToolbarDisplay, GridForm } from '../Components'

class ContactEditDisplay extends React.Component {
  constructor(data) {
    super()
    this.handleToggleClearLogs = this.handleToggleClearLogs.bind(this)
    this.handleOnChange = this.handleOnChange.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleSave = this.handleSave.bind(this)
    this.handleDelete = this.handleDelete.bind(this)
    this.state = {
      contact: data.contact
    }
    this.formProps = data.contact.getEditableProperties()
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  handleToggleClearLogs() {
    this.setState({
      clearLogs: !this.state.clearLogs
    })
  }

  handleDelete() {
    this.props.contact.deleteContact()
  }

  handleCancel() {
    this.props.contact.cancelUpsert()
  }

  handleSave() {
    const params = {}
    
    for (const formProp of this.formProps) {
      params[formProp.prop] = formProp 
    }
    params.clearLogs = {
      prop: 'clearLog',
      value: !!this.state.clearLogs
    }

    this.props.contact.saveUpsert(params)
  }
  
  handleOnChange(prop, value) {
    try {
      this.formProps.find(item => {return item.prop === prop}).value = value
    } catch (err) {
      /* do nothing */
    }
  }

  render() {
    this.formProps.find(item => {return item.prop === 'uuid'}).disabled = !!this.props.existingContact
    return (
      <div className="contact-edit">
        <div className="title">{`${this.props.existingContact ? 'Edit' : 'New'} - ${this.props.contact.getTitle()}`}</div>
        <GridForm
          formFields={this.formProps}
          onChange={this.handleOnChange}
        >
          {
            !!this.props.existingContact &&
            <button 
              prop="clearLogs" 
              className={`form-button ${this.state.clearLogs ? 'red' : 'cancel'}`}
              onClick={this.handleToggleClearLogs}
            >CLEAR LOG</button>
          }
        </GridForm>
        <ToolbarDisplay>
          <div 
            noflex="true"
            className="form-button square cancel"
            onClick={this.handleDelete}
          >
            <Icon
              className="outline-only red"
              iconSize={32}
              url="./icons_proc/trash.svg#trash"
            ></Icon>
          </div>
          <button className="form-button cancel" onClick={this.handleCancel}>CANCEL</button>
          <button className="form-button" onClick={this.handleSave}>SAVE</button>
        </ToolbarDisplay>
      </div>
    )
  }
}

export default ContactEditDisplay
