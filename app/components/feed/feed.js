import React, { useState, useEffect, useContext } from 'react'
import { TopRow, Title } from '../layout/grid'
import ContentRow from '../content/row'
import { encode } from 'dat-encoding'
import Footer, { FooterAddContent, FooterSearch } from '../footer/footer'
import { ProfileContext } from '../../lib/context'
import sort from '../../lib/sort'
import Loading, { LoadingFlex } from '../loading/loading'
import Tour from '../tour/tour'
import { ipcRenderer } from 'electron'

export default ({ p2p }) => {
  const [contents, setContents] = useState()
  const [isTourOpen, setIsTourOpen] = useState()
  const { url: profileUrl } = useContext(ProfileContext)

  useEffect(() => {
    ;(async () => {
      const profile = await p2p.get(profileUrl)
      const follows = await Promise.all(
        profile.rawJSON.follows.map(url => p2p.clone(encode(url)))
      )
      const profiles = [profile, ...follows]
      const contentUrls = [
        ...new Set(profiles.map(profile => profile.rawJSON.contents).flat())
      ]

      const contents = []
      for (const url of contentUrls) {
        try {
          const [key, version] = url.split('+')
          const content = await p2p.clone(encode(key), version)
          contents.push(content)
        } catch (err) {
          console.error(err)
        }
      }

      setContents(contents.flat().sort(sort))
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      setIsTourOpen(await ipcRenderer.invoke('getStoreValue', 'tour', true))
    })()
  }, [])

  useEffect(() => {
    const onTour = (_, isTourOpen) => setIsTourOpen(isTourOpen)
    ipcRenderer.on('tour', onTour)
    return () => ipcRenderer.removeListener('tour', onTour)
  }, [])

  return (
    <>
      <TopRow>
        <Title>Feed</Title>
      </TopRow>
      {contents ? (
        <>
          {contents.map(content => {
            return (
              <ContentRow
                key={`${content.rawJSON.url}+${content.metadata.version}`}
                p2p={p2p}
                content={content}
                to={`/contents/${encode(content.rawJSON.url)}/${
                  content.metadata.version
                }`}
                isRegistered
              />
            )
          })}
          <Footer
            title={
              <>
                {contents.length ? (
                  'You’ve reached the end! ✌️'
                ) : (
                  <>
                    Add content <FooterAddContent /> or <FooterSearch /> Find
                    someone to follow
                  </>
                )}
              </>
            }
          />
        </>
      ) : (
        <LoadingFlex>
          <Loading />
        </LoadingFlex>
      )}
      {isTourOpen && (
        <Tour
          isOpen={isTourOpen}
          onClose={() => ipcRenderer.invoke('setStoreValue', 'tour', false)}
        />
      )}
    </>
  )
}
