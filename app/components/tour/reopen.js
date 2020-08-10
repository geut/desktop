import React, { useContext, useEffect } from 'react'
import { TourContext } from '../../lib/context'

const ReopenTour = () => {
  const { tour: [, setIsTourOpen] } = useContext(TourContext)
  useEffect(() => {
    setIsTourOpen(true)
    // history.go(-1)
  })
  return (
    <></>
  )
}

export default ReopenTour
