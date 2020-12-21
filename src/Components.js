import { render } from '@testing-library/react'
import React from 'react'
import { CSSTransition } from 'react-transition-group'
import './Components.css'

class Overlay extends React.Component {
  constructor(data) {
    super()
    this.overlayLayerRef = React.createRef()
  }

  render() {
    return (
      <CSSTransition
        in={this.props.in}
        unmountOnExit
        timeout={400}
        nodeRef={this.overlayLayerRef}
        classNames="overlay"
      >
        <div className="overlay frame-absolute" ref={this.overlayLayerRef}>
          <div className="panel">
            {
              React.Children.map(this.props.children, child => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, { onClose: this.props.onClose })
                }
              })
            }
          </div>
        </div>
      </CSSTransition>
    )
  }
}

class ToolbarItemDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div
        className={`toolbar-item ${this.props.noflex ? 'no-flex' : ''}`}
        onClick={this.props.onClick}>
        {this.props.children}
      </div>
    )
  }
}

class ToolbarDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div
        id={this.props.id}
        className="toolbar flex-bar">
        {React.Children.map(this.props.children, child => {
          if (React.isValidElement(child)) {
            return (
              <ToolbarItemDisplay
                noflex={child.props.noflex}
              >
                {React.cloneElement(child)}
              </ToolbarItemDisplay>
            )
          }
        })}
      </div>
    )
  }
}

class Icon extends React.Component {
  render() {
    return (
      <svg
        className={`icon ${this.props.className || ''}`}
        viewBox={`0 0 ${this.props.iconSize} ${this.props.iconSize}`}
      >
        <use
          href={this.props.url}
        ></use>
      </svg>
    )
  }
}

class GridFormRow extends React.Component {
  constructor() {
    super()
    this.handleOnChange = this.handleOnChange.bind(this)
    this.handleOnCopy = this.handleOnCopy.bind(this)
  }

  handleOnChange(evt) {
    if (!this.props.onChange) return
    this.props.onChange(evt.target.value)
  }

  async handleOnCopy() {
    await navigator.clipboard.writeText(this.props.value || this.props.defaultValue)
  }

  render() {
    return (
      <React.Fragment>
        <label
          className="form-label"
        >{`${this.props.title ? this.props.title + ':' : ''}  `}</label>
        {
          React.Children.count(this.props.children) ?
            (
              React.Children.only(this.props.children)
            )
            :
            (this.props.disabled ?
              <div
                className={`form-input disabled ${this.props.copiable ? 'copiable' : ''}`}
                onClick={this.props.copiable ? this.handleOnCopy : undefined}
              >
                {this.props.value || this.props.defaultValue}
                {
                  !!this.props.copiable &&
                  <Icon
                    className="outline-only copy-icon"
                    iconSize={32}
                    url="./icons_proc/copy.svg#copy"
                  ></Icon>
                }
              </div>
              :
              <input
                className="form-input"
                type={this.props.inputType || "text"}
                defaultValue={this.props.value || this.props.defaultValue}
                onChange={this.handleOnChange}
              ></input>)
        }
      </React.Fragment>
    )
  }
}

class GridForm extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    this.onChange = this.onChange.bind(this)
  }

  onChange(prop, value) {
    if (!this.props.onChange) return
    this.props.onChange(prop, value)
  }

  render() {
    /* 
     * we cannot use <form> here because putting buttons in there
     * will attempt to submit the form on click. This is unwanted
     * behavior that sucks and confused me for like three hours 
     */
    return (
      <div className="grid-form">
        {
          !!this.props.formFields &&
          this.props.formFields.map((item, index) => {
            return (
              <GridFormRow
                key={`item-${item.prop}`}
                {...item}
                onChange={value => this.onChange(item.prop, value)}
              ></GridFormRow>
            )
          })
        }
        {
          !!React.Children.count(this.props.children) &&
          React.Children.map(this.props.children, (child, index) => {
            if (React.isValidElement(child)) {
              return (
                <GridFormRow
                key={`item-gen-${index}`}
                title={child.props.title}
                onChange={value => this.onChange(child.props.prop, value)}
                >{child}</GridFormRow>
              ) 
            }
          })
        }
      </div>
    )
  }
}

export {
  Overlay,
  ToolbarDisplay,
  ToolbarItemDisplay,
  Icon,
  GridFormRow,
  GridForm
}
