import React, { useState, useRef, useContext } from 'react'
import styled, { css } from 'styled-components'
import Modal, { Close } from './modal'
import { Heading2, Paragraph } from '../typography'
import { Label, Input } from '../forms/forms'
import { Button } from '../layout/grid'
import ArrowRight from '../icons/arrow-right-2rem.svg'
import X from '../icons/x-2rem.svg'
import Loading from '../loading/loading'
import { gray, red, yellow } from '../../lib/colors'
import { useHistory } from 'react-router-dom'
import { encode } from 'dat-encoding'
import { TourContext } from '../../lib/context'
import Tour from '../tour/tour'

const StyledButton = styled(Button)`
  margin-right: 0;
`
const input = css`
  display: inline-block;
  width: 35.12rem;
`
const StyledInput = styled(Input)`
  ${input}
  border-right: 0;
  ${props =>
    !props.isValid &&
    css`
      color: ${red};
    `}
`
const LoadingContainer = styled.div`
  ${input}
  background-color: ${gray};
  height: 4rem;
  position: relative;
`
const Warning = styled.span`
  color: ${yellow};
  font-style: italic;
  font-weight: normal;
  margin-left: 1rem;
`
const WarningEmoji = styled.span`
  font-style: normal;
`

const FindModal = ({ onClose, prefilledUrl, p2p }) => {
  const [isLoading, setIsLoading] = useState()
  const [url, setUrl] = useState(prefilledUrl)
  const [isUnavailable, setIsUnavailable] = useState()
  const { modalTour: [isModalTourOpen, setIsModalTourOpen] } = useContext(TourContext)
  const inputEl = useRef()
  const clonePromise = useRef()
  const history = useHistory()

  let isValid = false
  try {
    encode(url)
    isValid = true
  } catch (_) {}

  const onCloseWithCleanup = () => {
    if (clonePromise.current) {
      clonePromise.current.cancel()
    }
    onClose()
  }

  return (
    <>
      <Modal height={329} onClose={onCloseWithCleanup}>
        <Close onClick={onCloseWithCleanup} />
        <Heading2>Got a link?</Heading2>
        <Paragraph>
          Did someone send you a link for Hypergraph? Copy-paste it below and
          we'll download their information for you to see 😊 All their files are
          then ready for you to build on 🏗
        </Paragraph>
        <form
          onSubmit={async ev => {
            ev.preventDefault()

            if (isLoading) {
              clonePromise.current.cancel()
              setIsLoading(false)
            } else {
              setIsUnavailable(false)
              const [key, version] = inputEl.current.value.split('+')
              clonePromise.current = p2p.clone(encode(key), version)
              setIsLoading(true)
              let module

              try {
                module = await clonePromise.current
              } catch (err) {
                if (clonePromise.current.isCanceled) return
                console.error(err)
                setIsUnavailable(true)
                setIsLoading(false)
                return
              }

              setIsLoading(false)
              onClose()
              if (module.rawJSON.type === 'profile') {
                history.push(`/profiles/${encode(key)}`)
              } else {
                const url = version ? `${encode(key)}/${version}` : encode(key)
                history.push(`/contents/${url}`)
              }
            }
          }}
        >
          <Label>
            URL
            {isUnavailable && (
              <Warning>
                <WarningEmoji>⚠️</WarningEmoji>
                Hmm, couldn’t find this...
              </Warning>
            )}
          </Label>

          {isLoading ? (
            <LoadingContainer>
              <Loading />
            </LoadingContainer>
          ) : (
            <StyledInput
              ref={inputEl}
              isValid={isValid}
              defaultValue={url}
              onChange={ev => {
                setUrl(ev.target.value)
              }}
              id='find-input'
            />
          )}
          <StyledButton content='icon' disabled={!isValid}>
            {isLoading ? <X /> : <ArrowRight />}
          </StyledButton>
        </form>
      </Modal>
      <Tour
        steps={[
          {
            selector: '#find-input',
            content: `Perhaps you already know someone using Hypergraph? Paste their profile URL here to view it. 
            Otherwise, try this example content: hyper://d1c36fd97f224667bb6fdec0443988a03d090ed98253d13e5e851a9fcc996802.
            ⚠ If you're getting an error message, please retry a couple of times.
            If the profile you're looking for isn't hosted in the Vault, it could be that no one with the data is currently online.`
          }
        ]}
        isOpen={isModalTourOpen}
        onRequestClose={() => setIsModalTourOpen(false)}
      />
    </>
  )
}

export default FindModal
