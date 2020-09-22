import React from 'react'
import Reactour from 'reactour'
import styled from 'styled-components'
import { purple } from '../../lib/colors'

const StyledTour = styled(Reactour)`
  color: black;
  font-size: 0.9em;
  transition: none;
  -webkit-transition: none;
  button:focus {
    outline: 0;
  }
`

const Tour = ({ ...props }) => {
  return (
    <StyledTour
      {...props}
      accentColor={purple}
      closeWithMask={false}
      maskSpace={2}
    />
  )
}

export default Tour