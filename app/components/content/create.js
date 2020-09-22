import React, { useState, useEffect, useContext, useRef } from 'react'
import styled from 'styled-components'
import { TopRow, Title, Button } from '../layout/grid'
import Arrow from '../icons/arrow.svg'
import { Label, Select, Textarea } from '../forms/forms'
import TitleInput from '../forms/title-input'
import subtypes from '@hypergraph-xyz/wikidata-identifiers'
import AddFile from './add-file.svg'
import { remote } from 'electron'
import { purple, red, green, yellow } from '../../lib/colors'
import { basename, extname } from 'path'
import X from '../icons/x-1rem.svg'
import { promises as fs } from 'fs'
import { encode } from 'dat-encoding'
import { useHistory, useParams } from 'react-router-dom'
import Anchor from '../anchor'
import Store from 'electron-store'
import { ProfileContext } from '../../lib/context'
import Tabbable from '../accessibility/tabbable'

const { FormData } = window

const Container = styled.div`
  margin: 2rem;
  max-width: 40rem;
`
const BackArrow = styled(Arrow)`
  transform: rotate(270deg);
`
const Form = styled.form`
  margin-top: 2rem;
`
const Files = styled.div`
  margin-bottom: 2rem;
`
const File = styled.div`
  width: 100%;
  border: 2px solid ${purple};
  line-height: 2;
  padding-left: 1rem;
  margin-top: 1em;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 44px;
`
const RemoveFile = styled(X)`
  position: absolute;
  right: 14px;
  top: 8px;
`
const StyledAnchor = styled(Anchor)`
  margin-top: calc(1rem + 5px);
`

const store = new Store()

const allIndexesOf = (arr, el) => {
  const indexes = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === el) indexes.push(i)
  }
  return indexes
}

const Create = ({ p2p }) => {
  const [files, setFiles] = useState({})
  const [isCreating, setIsCreating] = useState()
  const [isValid, setIsValid] = useState()
  const [isValidDraft, setIsValidDraft] = useState()
  const [main, setMain] = useState()
  const [potentialParents, setPotentialParents] = useState()
  const history = useHistory()
  const { parentUrl } = useParams()
  const { url: profileUrl } = useContext(ProfileContext)
  const formRef = useRef()

  useEffect(() => {
    ;(async () => {
      const profiles = await p2p.listProfiles()
      setPotentialParents(
        (
          await Promise.all(
            profiles.map(profile =>
              Promise.all(
                profile.rawJSON.contents.map(url => {
                  const [key, version] = url.split('+')
                  return p2p.clone(encode(key), version, /* download */ false)
                })
              )
            )
          )
        ).flat()
      )
    })()
  }, [])

  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [])

  useEffect(() => {
    setIsValid(isValidDraft && Boolean(main))
  }, [isValidDraft, main])

  const setFilesUnique = files => {
    const sources = Object.keys(files)
    const destinations = sources.map(source => basename(source))
    for (let i = 0; i < sources.length; i++) {
      const [source, destination] = [sources[i], destinations[i]]
      const indexes = allIndexesOf(destinations, destination)
      const indexInIndexes = indexes.indexOf(i)
      if (indexInIndexes > 0) {
        const ext = extname(destination)
        const base = basename(destination, ext)
        files[source] = `${base} (${indexInIndexes + 1})${ext}`
      } else {
        files[source] = destination
      }
    }
    setFiles(files)
  }

  const create = async ({ register }) => {
    setIsCreating({ register })

    const data = new FormData(formRef.current)
    let {
      rawJSON: { url },
      metadata: { version }
    } = await p2p.init({
      type: 'content',
      subtype: data.get('subtype'),
      title: data.get('title'),
      description: data.get('description'),
      authors: [encode(profileUrl)],
      parents: [data.get('parent')].filter(Boolean)
    })

    const dir = `${remote.app.getPath('home')}/.p2pcommons/${encode(url)}`
    for (const [source, destination] of Object.entries(files)) {
      await fs.copyFile(source, `${dir}/${destination}`)
    }
    if (main) {
      ;({
        metadata: { version }
      } = await p2p.set({ url, main }))
    }
    if (register) {
      await p2p.register(`${encode(url)}+${version}`, profileUrl)
      history.push(`/profiles/${encode(profileUrl)}/${encode(url)}`)
    } else {
      history.push(`/drafts/${encode(url)}`)
    }
  }

  return (
    <>
      <TopRow>
        <Title>Add Content</Title>
      </TopRow>
      <Container>
        <Tabbable component={BackArrow} onClick={() => history.go(-1)} />
        <Form
          ref={formRef}
          onSubmit={ev => {
            ev.preventDefault()
            create({ register: false })
          }}
        >
          {potentialParents && potentialParents.length > 0 && (
            <div>
              <Label htmlFor='parent'>Follows from</Label>
              <Select name='parent' defaultValue={parentUrl}>
                <option />
                {potentialParents.map(parent => {
                  const value = [
                    encode(parent.rawJSON.url),
                    parent.metadata.version
                  ].join('+')
                  return (
                    <option value={value} key={value}>
                      {parent.rawJSON.title}
                    </option>
                  )
                })}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor='subtype'>Content type</Label>
            <Select large name='subtype'>
              {Object.entries(subtypes).map(([id, text]) => (
                <option value={id} key={id}>
                  {text}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor='files'>Add files</Label>
            <Button
              type='button'
              onClick={async e => {
                e.preventDefault()
                const opts = {
                  properties: ['multiSelections', 'openFile']
                }
                if (!store.get('create open dialog displayed')) {
                  // set the default path on first launch, so it's not the
                  // app's directory
                  opts.defaultPath = remote.app.getPath('documents')
                  store.set('create open dialog displayed', true)
                }
                const {
                  filePaths: newSources
                } = await remote.dialog.showOpenDialog(
                  remote.getCurrentWindow(),
                  opts
                )

                const newFiles = { ...files }
                for (const source of newSources) {
                  const destination = basename(source)
                  newFiles[source] = destination
                }

                setFilesUnique(newFiles)
              }}
            >
              <AddFile />
            </Button>
            <Files>
              {Object.entries(files).map(([source, destination]) => (
                <File key={source}>
                  {destination}
                  <RemoveFile
                    onClick={() => {
                      const newFiles = { ...files }
                      delete newFiles[source]
                      setFilesUnique(newFiles)
                      if (main === destination) setMain(null)
                    }}
                  />
                </File>
              ))}
            </Files>
          </div>
          <div>
            <Label htmlFor='main'>Main file</Label>
            <Select name='main' onChange={ev => setMain(ev.target.value)}>
              <option value=''>No main</option>
              {Object.values(files)
                .filter(destination => destination.charAt(0) !== '.')
                .map(destination => (
                  <option value={destination} key={destination}>
                    {destination}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor='title'>Title</Label>
            <TitleInput name='title' onIsValid={setIsValidDraft} />
          </div>
          <div>
            <Label htmlFor='description'>Description</Label>
            <Textarea name='description' />
          </div>
          <div>
            <Button
              type='button'
              isLoading={isCreating && isCreating.register}
              disabled={!isValid || isCreating}
              color={green}
              onClick={() => create({ register: true })}
            >
              Add to profile
            </Button>
            <Button
              isLoading={isCreating && !isCreating.register}
              disabled={!isValidDraft || isCreating}
              color={yellow}
            >
              Save as draft
            </Button>
            <StyledAnchor
              onClick={() => history.go(-1)}
              color={red}
              disabled={isCreating}
            >
              Cancel
            </StyledAnchor>
          </div>
        </Form>
      </Container>
    </>
  )
}

export default Create
