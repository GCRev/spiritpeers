import React from 'react'

class ToolbarDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div
        id="main-toolbar"
        className="flex-center visual-test">
          {this.props.children}
      </div>
    )
  }
}

export default ToolbarDisplay
