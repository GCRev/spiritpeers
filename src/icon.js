const SVGNS = 'http://www.w3.org/2000/svg'

export function createSvgIcon (pathToFile, iconSize, ...className) {

  if (isNaN(iconSize)) {
    iconSize = 32
  }
  const icon = document.createElement('icon')
  icon.setAttribute('class', ('icon ' + className.join(' ')).trim())

  const svg = document.createElementNS(SVGNS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${iconSize} ${iconSize}`)

  const use = document.createElementNS(SVGNS, 'use')
  use.setAttribute('href', pathToFile)

  svg.appendChild(use)
  icon.appendChild(svg)

  return icon
}

export function setHref(icon, href) {
  const use = icon.querySelector('use')
  use.setAttribute('href', href)
  return icon
}
