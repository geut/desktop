import React, { useState, useEffect, useContext } from 'react'
import styled from 'styled-components'
import { TopRow, Row, Title, Button } from '../layout/grid'
import { ProfileContext } from '../../lib/context'
import { Heading3 } from '../typography'
import Avatar from '../avatar/avatar'
import { useHistory } from 'react-router-dom'
import { encode } from 'dat-encoding'
import Footer from '../footer/footer'

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
  const history = useHistory()

  useEffect(() => {
    ;(async () => {
      setFollowing(
        await Promise.all(
          (await p2p.get(profileUrl)).rawJSON.follows.map(key => p2p.clone(key))
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
          {following.map(profile => {
            const url = `/profiles/${encode(profile.rawJSON.url)}`
            return (
              <Row noBorderTop key={profile.rawJSON.url}>
                <Profile onClick={() => history.push(url)}>
                  <StyledAvatar name={profile.rawJSON.title} size='40px' />
                  <Heading3>{profile.rawJSON.title}</Heading3>
                </Profile>
                {unfollowed[profile.rawJSON.url] ? (
                  <StyledButton
                    onClick={async () => {
                      setUnfollowed({
                        ...unfollowed,
                        [profile.rawJSON.url]: false
                      })
                      await p2p.follow(profileUrl, profile.rawJSON.url)
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
                      await p2p.unfollow(profileUrl, profile.rawJSON.url)
                    }}
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
    </div>
  )
}

export default Following