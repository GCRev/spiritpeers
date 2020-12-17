import React from 'react'

class ToolbarItemDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div 
      className="toolbar-item visual-test"
      onClick={this.props.clickEvent}>
        TBI
        {/* <div>icon</div> */}
      </div>
    )
  }
}

export default ToolbarItemDisplay
