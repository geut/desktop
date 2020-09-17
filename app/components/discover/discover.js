import React, { useState, useEffect } from 'react'
import { TopRow, Title } from '../layout/grid'
import ContentRow from '../content/row'
import { encode } from 'dat-encoding'
import Footer, { FooterAddContent, FooterSearch } from '../footer/footer'
import fetch from 'node-fetch'

export default ({ p2p }) => {
  const [contents, setContents] = useState()

  useEffect(() => {
    ;(async () => {
      const res = await fetch('https://vault.hypergraph.xyz/api/modules')
      const json = await res.json()
      const urls = json
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(row => row.url.split('+'))
        .filter(([_, version]) => Boolean(version))
      urls.length = 10
      console.log({ urls })
      const contents = await Promise.all(
        urls.map(async ([key, version]) => {
          const p = p2p.clone(encode(key), version)
          const id = setTimeout(() => p.cancel('Timeout'), 5000)
          let content
          try {
            content = await p
          } catch (err) {
            clearTimeout(id)
            console.error(err)
          }
          return content
        })
      )
      console.log({ contents })
      setContents(contents.filter(Boolean))
    })()
  }, [])

  return (
    <>
      <TopRow>
        <Title>Discover</Title>
      </TopRow>
      {contents && (
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
      )}
    </>
  )
}
