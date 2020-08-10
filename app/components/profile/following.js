import React, { useState, useEffect, useContext } from 'react'
import styled from 'styled-components'
import { TopRow, Row, Title, Button } from '../layout/grid'
import { ProfileContext, TourContext } from '../../lib/context'
import Tour from '../tour/tour'
import { Heading3 } from '../typography'
import Avatar from '../avatar/avatar'
import { useHistory } from 'react-router-dom'
import { encode } from 'dat-encoding'
import Footer from '../footer/footer'
import Tabbable from '../accessibility/tabbable'

const StyledButton = styled(Button)`
  display: none;
  ${Row}:hover & {
    display: block;
  }
`
const Profile = styled.span`
  display: flex;
  align-items: center;
  flex-grow: 1;
  height: 100%;
`
const StyledAvatar = styled(Avatar)`
  margin-left: 2rem;
  margin-right: 1rem;
  div {
    font-size: 1rem;
  }
`

const Following = ({ p2p }) => {
  const [following, setFollowing] = useState()
  const [unfollowed, setUnfollowed] = useState({})
  const { url: profileUrl } = useContext(ProfileContext)
  const { tour: [isTourOpen, setIsTourOpen] } = useContext(TourContext)
  const history = useHistory()

  useEffect(() => {
    ;(async () => {
      setFollowing(
        await Promise.all(
          (await p2p.get(profileUrl)).rawJSON.follows.map(key =>
            p2p.clone(encode(key))
          )
        )
      )
    })()
  }, [])

  return (
    <div>
      <TopRow>
        <Title>Following</Title>
      </TopRow>
      {following && (
        <>
          {following.map((profile, i) => {
            const url = `/profiles/${encode(profile.rawJSON.url)}`
            return (
              <Row noBorderTop key={profile.rawJSON.url} id={`profilerow-${i}`}>
                <Tabbable component={Profile} onClick={() => history.push(url)}>
                  <StyledAvatar name={profile.rawJSON.title} size='40px' />
                  <Heading3>{profile.rawJSON.title}</Heading3>
                </Tabbable>
                {unfollowed[profile.rawJSON.url] ? (
                  <StyledButton
                    onClick={async () => {
                      setUnfollowed({
                        ...unfollowed,
                        [profile.rawJSON.url]: false
                      })
                      await p2p.follow(
                        encode(profileUrl),
                        encode(profile.rawJSON.url)
                      )
                    }}
                  >
                    Follow
                  </StyledButton>
                ) : (
                  <StyledButton
                    onClick={async () => {
                      setUnfollowed({
                        ...unfollowed,
                        [profile.rawJSON.url]: true
                      })
                      await p2p.unfollow(
                        encode(profileUrl),
                        encode(profile.rawJSON.url)
                      )
                    }}
                    id={`profilerow-${i}-unfollow`}
                  >
                    Unfollow
                  </StyledButton>
                )}
              </Row>
            )
          })}
          <Footer
            title={
              following.length
                ? 'You’ve reached the end! ✌️'
                : 'You’re not following anybody yet 😅'
            }
          />
        </>
      )}
      <Tour
        steps={(() => {
          const steps = [{
            content: 'This displays all the profiles you follow.'
          }]
          if (!following || !following.length) {
            steps.push({
              selector: '#menu-find',
              content: 'Click Find to look up a profile to follow.'
            })
          }
          if (following && following.length) {
            steps.push({
              selector: '#profilerow-0',
              content: 'Click to open a profile...'
            })
            steps.push({
              selector: '#profilerow-0-unfollow',
              content: '...or use the Unfollow buttons to quickly clean up your feed.'
            })
          }
          return steps
        })()}
        isOpen={isTourOpen}
        onRequestClose={() => setIsTourOpen(false)}
      />
    </div>
  )
}

export default Following
