import React, { useState, useEffect, useRef, Fragment, useContext } from 'react'
import styled, { css, keyframes } from 'styled-components'
import Avatar from '../avatar/avatar'
import ContentRow from '../content/row'
import Footer from '../footer/footer'
import { encode } from 'dat-encoding'
import { Title, StickyRow, TopRow, Button } from '../layout/grid'
import { green, red, yellow, gray } from '../../lib/colors'
import { Textarea, Input } from '../forms/forms'
import Share from '../icons/share.svg'
import { useParams } from 'react-router-dom'
import ShareModal from './share-modal'
import sort from '../../lib/sort'
import { ProfileContext, TourContext } from '../../lib/context'
import Tour from '../tour/tour'

const Header = styled.div`
  position: relative;
`
const StyledAvatar = styled(Avatar)`
  margin-left: 2rem;
  margin-top: 2rem;
  margin-bottom: 23px;
`
const saved = keyframes`
  0% {
    border-left-color: transparent;
  }
  50% {
    border-left-color: ${green};
  }
  100% {
    border-left-color: transparent;
  }
`
const Indicator = styled.div`
  border-left: 2px solid transparent;
  height: 45px;
  display: inline-block;
  position: relative;
  left: -0.5rem;
  top: 0.5rem;
  margin-left: -2px;
  transition: border-left-color 1s;

  ${props =>
    props.isEditing &&
    css`
      border-left-color: ${yellow};
    `}
  ${props =>
    props.isInvalid &&
    css`
      border-left-color: ${red};
    `}
  ${props =>
    props.isSaving &&
    css`
      border-left-color: transparent;
    `}
  ${props =>
    props.isSaved &&
    css`
      animation: ${saved} 2s linear;
    `}
`
const Description = styled.div`
  position: absolute;
  left: 11rem;
  top: calc(2rem - 4px);
  right: 146px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  border-left: 2px solid transparent;
  padding-left: 0.5rem !important;
  margin-left: calc(-0.5rem - 2px) !important;
  transition: border-left-color 1s;
  ${props =>
    props.isEmpty &&
    css`
      color: ${gray};
      :hover {
        cursor: text;
      }
    `}
  ${props =>
    props.isEditing &&
    css`
      border-left-color: ${yellow};
    `}
  ${props =>
    props.isSaving &&
    css`
      border-left-color: transparent;
    `}
  ${props =>
    props.isSaved &&
    css`
      animation: ${saved} 2s linear;
    `}
`
const StyledTextarea = styled(Textarea)`
  height: 4.5rem;
  border: 0;
  padding: 0;
  margin: 0;
  outline: 0;
  resize: none;
`
const Form = styled.form`
  display: flex;
  width: 100%;
`
const StyledInput = styled(Input)`
  margin-bottom: 0;
`

const Profile = ({ p2p }) => {
  const { key } = useParams()
  const [profile, setProfile] = useState()
  const [contents, setContents] = useState()
  const [isEditing, setIsEditing] = useState()
  const [isPopulatingDescription, setIsPopulatingDescription] = useState()
  const [isSaving, setIsSaving] = useState()
  const [isSaved, setIsSaved] = useState()
  const [isTitleInvalid, setIsTitleInvalid] = useState()
  const [isSharing, setIsSharing] = useState()
  const [nameForAvatar, setNameForAvatar] = useState()
  const [ownProfile, setOwnProfile] = useState()
  const [isOwnProfile, setIsOwnProfile] = useState()
  const [isFollowed, setIsFollowed] = useState()
  const { url: ownProfileUrl } = useContext(ProfileContext)
  const { tour: [isTourOpen, setIsTourOpen] } = useContext(TourContext)
  const [tourStep, setTourStep] = useState(0)
  const titleRef = useRef()
  const descriptionRef = useRef()

  const fetchContents = async profile => {
    const contents = await Promise.all(
      profile.rawJSON.contents.map(url => {
        const [key, version] = url.split('+')
        const download = true
        return p2p.clone(encode(key), version, download)
      })
    )
    contents.sort(sort)
    setContents(contents)
  }

  const fetchOwnProfile = async () =>
    setOwnProfile(await p2p.get(ownProfileUrl))

  const onSubmit = async e => {
    e.preventDefault()
    const tourWasOpen = isTourOpen
    setIsTourOpen(false)
    setIsSaving(true)
    try {
      await p2p.set({
        url: profile.rawJSON.url,
        title: titleRef.current.value,
        description: descriptionRef.current.value
      })
    } catch (_) {
      setIsTitleInvalid(true)
      setIsSaving(false)
      setIsEditing(false)
      return
    }
    setIsTitleInvalid(false)
    setIsSaving(false)
    setProfile(await p2p.get(profile.rawJSON.url))
    setIsEditing(false)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
    setTourStep(3)
    setIsTourOpen(tourWasOpen)
    await fetchContents(profile)
  }

  useEffect(() => {
    ;(async () => {
      setContents(null)
      const profile = await p2p.clone(encode(key), null, false /* download */)
      setProfile(profile)
      setIsOwnProfile(profile.rawJSON.url === ownProfileUrl)
      setNameForAvatar(profile.rawJSON.title)
      await fetchContents(profile)
    })()
  }, [key])

  useEffect(() => {
    if (!descriptionRef.current) return
    descriptionRef.current.focus()
    setIsPopulatingDescription(false)
  }, [key, isPopulatingDescription])

  useEffect(() => {
    fetchOwnProfile()
  }, [])

  useEffect(() => {
    if (!profile) return
    if (!profile.metadata.isWritable && ownProfile) {
      setIsFollowed(ownProfile.rawJSON.follows.find(
        url => encode(url) === encode(profile.rawJSON.url)
      ))
    }
  }, [key, profile, ownProfile])

  if (!profile) return null

  return (
    <>
      {isSharing && (
        <ShareModal
          url={profile.rawJSON.url}
          onClose={() => setIsSharing(false)}
        />
      )}
      <TopRow>
        <Form onSubmit={onSubmit}>
          <Title id='profile-title'>
            <Indicator
              isEditing={isEditing}
              isSaving={isSaving}
              isSaved={isSaved}
              isInvalid={isTitleInvalid}
            />
            {isEditing ? (
              <StyledInput
                ref={titleRef}
                defaultValue={profile.rawJSON.title}
                onChange={e => {
                  setIsTitleInvalid(
                    e.target.value.length === 0 || e.target.value.length > 300
                  )
                  setNameForAvatar(e.target.value)
                }}
              />
            ) : (
              profile.rawJSON.title
            )}
          </Title>
          {isFollowed ? (
            <Button
              type='button'
              onClick={async () => {
                await p2p.unfollow(
                  encode(ownProfile.rawJSON.url),
                  encode(profile.rawJSON.url)
                )
                await fetchOwnProfile()
              }}
            >
                Unfollow
            </Button>
          ) : (
            <Button
              type='button'
              onClick={async () => {
                await p2p.follow(
                  encode(ownProfile.rawJSON.url),
                  encode(profile.rawJSON.url)
                )
                setTourStep(5)
                await fetchOwnProfile()
              }}
              id='profile-follow'
            >
                Follow
            </Button>
          )}
          <Button
            content='icon'
            type='button'
            onClick={() => setIsSharing(true)}
            id='profile-share'
          >
            <Share />
          </Button>
          {isEditing ? (
            <>
              <Button
                color={green}
                disabled={isTitleInvalid}
                id='profile-save'
              >
                Save
              </Button>
              <Button
                color={red}
                onClick={() => {
                  setIsEditing(false)
                  setIsTitleInvalid(false)
                }}
              >
                Cancel
              </Button>
            </>
          ) : profile.metadata.isWritable ? (
            <Button
              type='button'
              color={green}
              onClick={() => setIsEditing(true)}
              id='profile-edit'
            >
              Edit profile
            </Button>
          ) : null}
        </Form>
      </TopRow>
      <Header id='profile-header'>
        <StyledAvatar name={nameForAvatar} />
        <Description
          isEditing={isEditing}
          isSaving={isSaving}
          isSaved={isSaved}
          isEmpty={profile.rawJSON.description.length === 0}
          onClick={() => {
            if (
              profile.metadata.isWritable &&
              profile.rawJSON.description.length === 0 &&
              !isEditing
            ) {
              setIsEditing(true)
              setIsPopulatingDescription(true)
              setTourStep(1)
            }
          }}
        >
          {isEditing ? (
            <StyledTextarea
              ref={descriptionRef}
              defaultValue={profile.rawJSON.description}
            />
          ) : profile.rawJSON.description ? (
            profile.rawJSON.description.split('\n').map((line, index) => (
              <Fragment key={index}>
                {line}
                <br />
              </Fragment>
            ))
          ) : profile.metadata.isWritable ? (
            'Add a description…'
          ) : null}
        </Description>
      </Header>
      <StickyRow top='114px'>
        <Title>Content</Title>
      </StickyRow>
      {contents && (
        <div id='profile-content'>
          {contents.map((content, i) => {
            return (
              <ContentRow
                key={content.rawJSON.url}
                p2p={p2p}
                content={content}
                to={`/profiles/${encode(profile.rawJSON.url)}/${encode(
                  content.rawJSON.url
                )}`}
                id={`contentrow-${i}`}
              />
            )
          })}
          <Footer
            title={
              contents.length
                ? 'You’ve reached the end! ✌️'
                : 'No content yet... 🤔'
            }
          />
        </div>
      )}
      {!isOwnProfile &&
        <Tour
          steps={(() => {
            const steps = [
              {
                content: <div>Great, you've found someone to follow! Let's take a little tour of their profile.</div>
              },
              {
                selector: '#profile-title',
                content: (
                  <div>
                    Here is their name, which might change over time if they choose to alter it.
                    The change will even be synchronized across their existing work!
                  </div>
                )
              },
              {
                selector: '#profile-header',
                content: <div>Here's a space for a little bio...</div>
              },
              {
                selector: '#profile-content',
                content: <div>And here's their work, if they've added anything to their profile yet.</div>
              },
              {
                selector: '#profile-share',
                content: <div>You can also share their profile with others using this button.</div>
              }]
            if (!isFollowed) {
              steps.push({
                selector: '#profile-follow',
                content: (
                  <div>
                    Now this is what we're looking for.
                    Clicking <i>Follow</i> means that you'll see this researcher's content appear in your feed.
                    You can unfollow profiles at any time. Click <i>Follow</i>...
                  </div>
                )
              })
            }
            steps.push({
              selector: '#menu-feed',
              content: <div>... and then open the <i>Feed</i> again.</div>
            })
            return steps
          })()}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
          goToStep={tourStep}
        />}
      {isOwnProfile && (!contents || !contents.length) &&
        <Tour
          steps={[
            {
              content: (
                <div>
                  This is you! To make sure you always retain access to this profile,
                  we advise backing up your Hypergraph database somewhere safe through <i>Database → Back up database</i>
                  in the menu bar. Hypergraph will close and reopen. You can re-open this tour via the Help menu.
                </div>
              )
            },
            {
              selector: '#profile-header',
              content: (
                <div>
                  Let's add a little bio. Click <i>Add a description</i> to get writing.
                  Perhaps you can add something about your background, interests, affiliations
                  and link to some of your other profiles online.
                </div>
              )
            },
            {
              selector: '#profile-save',
              content: <div>Now let's save your bio!</div>
            },
            {
              selector: '#profile-share',
              content: (
                <div>
                  Use the <i>Share</i> button to share your profile with others...
                  Or maybe we should add some content first?
                </div>
              )
            },
            {
              selector: '#menu-create',
              content: <div>Click here to get started on your first Hypergraph content!</div>
            }
          ]}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
          goToStep={tourStep}
          disableFocusLock
        />}
      {isOwnProfile && contents && contents.length > 0 &&
        <Tour
          steps={[
            {
              content: (
                <div>
                  Looking good! If you haven't made a backup already, now would be a great time to do so.
                  Otherwise, a computer crash could mean you'd lose access to your profile.
                  See <i>Database → Back up database</i> in the menu bar.
                  Hypergraph will close and reopen, but you can re-open this tour via the Help menu.
                </div>
              ),
              action: () => {
                document.getElementById('contentrow-0-addcontentwithparent').style.display = 'block'
              }
            },
            {
              selector: '#contentrow-0-addcontentwithparent',
              content: <div>You can click this button to add new content that follows from this.</div>
            },
            {
              content: (
                <div>
                  Great job! It seems like you've seen a lot of what Hypergraph has to offer.
                  If there are pages you haven't been to yet, click around. You can always re-open this tour later via the Help menu.
                  Thanks for following this tour, good luck with Hypergraph and much 💜 from the team at Liberate Science.
                </div>
              )
            }
          ]}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
        />}
    </>
  )
}

export default Profile
