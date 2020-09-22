import React, { useState, useEffect, useContext } from 'react'
import { TopRow, Title } from '../layout/grid'
import ContentRow from '../content/row'
import { encode } from 'dat-encoding'
import Footer from '../footer/footer'
import { ProfileContext, TourContext } from '../../lib/context'
import sort from '../../lib/sort'
import Tour from '../tour/tour'

export default ({ p2p }) => {
  const [contents, setContents] = useState()
  const [follows, setFollows] = useState([])
  const {
    tour: [isTourOpen, setIsTourOpen]
  } = useContext(TourContext)
  const { url: profileUrl } = useContext(ProfileContext)

  useEffect(() => {
    ;(async () => {
      const profile = await p2p.get(profileUrl)
      const follows = await Promise.all(
        profile.rawJSON.follows.map(url => p2p.clone(encode(url)))
      )
      const profiles = [profile, ...follows]
      const contents = await Promise.all(
        profiles.map(profile =>
          Promise.all(
            profile.rawJSON.contents.map(url => {
              const [key, version] = url.split('+')
              return p2p.clone(encode(key), version)
            })
          )
        )
      )
      setContents(contents.flat().sort(sort))
      setFollows(follows)
    })()
  }, [])

  return (
    <>
      <TopRow>
        <Title>Feed</Title>
      </TopRow>
      {contents && (
        <>
          {contents.map((content, i) => {
            return (
              <ContentRow
                key={content.rawJSON.url}
                p2p={p2p}
                content={content}
                to={`/contents/${encode(content.rawJSON.url)}/${
                  content.metadata.version
                }`}
                id={`tour-contentrow-${i}`}
              />
            )
          })}
          <Footer
            title={
              <>
                {contents.length
                  ? 'You’ve reached the end! ✌️'
                  : 'Share content or follow someone to fill up your feed 🙌'}
              </>
            }
          />
        </>
      )}
      {!follows.length && (
        <Tour
          steps={[
            {
              content: (
                <div>
                  <p>
                    Welcome to Hypergraph (Beta) 🥳 We'll get you started with a
                    short tour of the most important things.
                  </p>
                </div>
              )
            },
            {
              content: (
                <div>
                  <p>First things first: Creating a backup.</p>
                  <p>
                    We don't use passwords, but keys 🔑 Just like your house
                    keys, you need to store them safely and not lose them.
                  </p>
                </div>
              )
            },
            {
              content: (
                <div>
                  <p>
                    Create a backup by clicking{' '}
                    <i>Database → Back up database</i> in the menu bar (at the
                    top).
                  </p>
                  <p>
                    We cannot help you recover these so store them safely! Maybe
                    your Dropbox, USB stick, or somewhere else 🤔
                  </p>
                </div>
              )
            },
            {
              content: (
                <div>
                  <p>Now we'll see where you can find what information.</p>
                </div>
              )
            },
            {
              selector: '#tour-menu-feed',
              content: (
                <div>The feed tab shows all content in your network.</div>
              )
            },
            {
              selector: '#tour-menu-drafts',
              content: (
                <div>
                  The drafts tab shows your unfinished work and things you've
                  co-authored but haven't added to your profile yet.
                </div>
              )
            },
            {
              selector: '#tour-menu-profile',
              content: (
                <div>
                  The profile tab allows you to see and update your profile.
                </div>
              )
            },
            {
              selector: '#tour-menu-following',
              content: (
                <div>
                  The following tab gives you a quick overview of the people in
                  your network.
                </div>
              )
            },
            {
              selector: '#tour-menu-find',
              content: <div>You can open Hypergraph links here.</div>
            },
            {
              selector: '#tour-menu-create',
              content: (
                <div>Add your research steps by clicking this big button.</div>
              )
            },
            {
              selector: '#tour-chatra',
              content: (
                <div>
                  <p>That's the most crucial bits already 😅</p>
                  <p>
                    If anything gets confusing, we're available in the chat on
                    the bottom right (no bots!).
                  </p>
                  <p>
                    Feel free to say hello, ask a question, or give us feedback!
                    🙋🏻‍♀️ 🙋🏽‍♂️ 🙋🏿‍♀️
                  </p>
                </div>
              )
            }
          ]}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
        />
      )}
    </>
  )
}
