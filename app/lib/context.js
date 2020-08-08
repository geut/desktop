import { createContext } from 'react'

export const ProfileContext = createContext({ url: null })
export const TourContext = createContext({ tour: [], modalTour: [] })