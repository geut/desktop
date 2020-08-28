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
                  Want each part of Hypergraph explained? Then this tour is for
                  you! Otherwise, you can always re-open it later through the{' '}
                  <i>Help</i> menu.
                </div>
              )
            },
            {
              selector: '#tour-chatra',
              content: (
                <div>
                  We are available in the chat for questions and feedback. Feel
                  free to say hello! 🙋🏻‍♀️🙋🏽‍♂️🙋🏿‍♀️
                </div>
              )
            },
            {
              content: (
                <div>
                  The feed is where new content shows up once you follow people,
                  so you can stay up-to-date on their work.
                </div>
              )
            },
            {
              selector: '#tour-menu-find',
              content: (
                <div>
                  Here you can look up Hypergraph profiles and content. You can
                  also search for things you've created or viewed previously.
                  Click <i>Find</i> if you'd like to follow someone or continue
                  to start adding content.
                </div>
              )
            },
            {
              selector: '#tour-menu-create',
              content: (
                <div>Click the + icon to add your work to Hypergraph.</div>
              )
            }
          ]}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
        />
      )}
      {follows.length > 0 && (
        <Tour
          steps={(() => {
            const steps = [
              {
                content: (
                  <div>
                    If you've followed someone with content on their profile,
                    you'll see their work here now. When new content arrives,
                    your feed gets updated!.
                  </div>
                )
              }
            ]
            if (contents.length) {
              steps.push({
                selector: '#tour-contentrow-0',
                content: (
                  <div>
                    Move the mouse over to the right to add new content that
                    follows from this. Build on top of work of others or simply
                    add the next step in your research project.
                  </div>
                )
              })
            }
            steps.push({
              selector: '#tour-menu-profile',
              content: <div>Now, let's take a look at your own profile!'</div>
            })
            return steps
          })()}
          isOpen={isTourOpen}
          onRequestClose={() => setIsTourOpen(false)}
        />
      )}
    </>
  )
}
