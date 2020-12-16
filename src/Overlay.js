import React from 'react'
import { CSSTransition } from 'react-transition-group'

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
            {this.props.children}
          </div>
        </div>
      </CSSTransition>
    )
  }
}

export default Overlay
