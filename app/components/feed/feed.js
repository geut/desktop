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
  const [isTourOpen, setIsTourOpen] = useContext(TourContext)
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
          {contents.map(content => {
            return (
              <ContentRow
                key={content.rawJSON.url}
                p2p={p2p}
                content={content}
                to={`/contents/${encode(content.rawJSON.url)}/${
                  content.metadata.version
                }`}
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
      {!follows.length && <Tour
        steps={[
          {
            content: `Here's a tour for you if you want each part of Hypergraph explained. 
            You can re-open it later through the Help menu.`
          },
          {
            selector: '#chatra',
            content: `We are available in the chat for questions and feedback. Feel free to say hello! 🙋🏻‍♀️`
          },
          {
            content: `Let's get started... The feed is where new content shows up once you follow people,
            so you can stay up-to-date on their work.`
          },
          {
            selector: '#menu-find',
            content: `Here you can look up Hypergraph profiles and content via hyper:// URLs.
            You can also search for things you've created or viewed previously.
            Click Find if you'd like to follow someone or continue to start adding content.`
          },
          {
            selector: `#menu-create`,
            content: `Click the + icon to add your work to Hypergraph.`
          }
        ]}
        isOpen={isTourOpen}
        onRequestClose={() => setIsTourOpen(false)}
      />}
    </>
  )
}
