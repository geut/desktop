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
import { ProfileContext, TourContext } from '../../lib/context'
import Tour from '../tour/tour'
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
const Info = styled.p`
  margin-bottom: 2rem;
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
  const { tour: [isTourOpen, setIsTourOpen] } = useContext(TourContext)
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
            <div id='create-parent'>
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
          <div id='create-subtype'>
            <Label htmlFor='subtype'>Content type</Label>
            <Select large name='subtype'>
              {Object.entries(subtypes).map(([id, text]) => (
                <option value={id} key={id}>
                  {text}
                </option>
              ))}
            </Select>
          </div>
          <div id='create-files'>
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
          <div id='create-main'>
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
          <div id='create-title'>
            <Label htmlFor='title'>Title</Label>
            <TitleInput name='title' onIsValid={setIsValidDraft} />
          </div>
          <div id='create-description'>
            <Label htmlFor='description'>Description</Label>
            <Textarea name='description' />
          </div>
          <div id='create-buttons'>
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
      <Tour
        steps={(() => {
          const steps = [{
            content: `Creating content as-you-go, how exciting!
            Even if you're part of the way through a project,
            you can just start with the step you're working on now.`
          }]
          if (potentialParents && potentialParents.length > 0) {
            steps.push({
              selector: '#create-parent',
              content: `What's the previous step of this research?
              It could be your own content or someone else's,
              but it has to be listed on someone's profile to be eligible for selection.
  
              Selection of multiple Follows from items will be possible soon,
              because research doesn't always go in a straight line. 😉`
            })
          }
          steps.push({
            selector: '#create-subtype',
            content: `This indicates what kind of information you're adding.
            At the start of a project, this is likely to be Theory, Idea or Problem statement,
            but could be something else. Perhaps you developed your Hypothesis first?
            Or you wrote some Code to analyse an existing data set?
            If you're missing an option, let us know via the chat!`
          })
          steps.push({
            selector: '#create-files',
            content: `These files are copied to the Hypergraph folder on your computer.
            If you want to keep working on this content,
            you can either continue working on Hypergraph's copies or reimport the files when you're done.

            If you're adding in-progress or completed research,
            you might need to copy-paste text from your existing files into new files to separate out the different steps.
            
            You need to add at least one file to be able to share content or add it to your profile.`
          })
          steps.push({
            selector: '#create-main',
            content: `Select the file that you want readers to open first.
            This could be a document that ties all other files together.
            If you only have one file, select that as the main file.
            Other files will be supporting files.

            You need to select a main file to be able to share content or add it to your profile.`
          })
          steps.push({
            selector: '#create-title',
            content: `Differently from traditional articles, each step of your research has its own title.
            Try to be descriptive of what's included in this specific piece of content.

            If you're feeling stuck, you could go with a simple "<Content type> for <study title>"
            or even just use the title of your study. The content type will always display,
            so readers can easily differentiate between the different steps of your research.`
          })
          steps.push({
            selector: '#create-description',
            content: `How would you briefly explain to someone what you're sharing?
            You could give a short summary, perhaps list some characteristics of the research you've done.
            Try to be descriptive of the research overall, but also specific to this step of your research.

            If you're feeling stuck, try to think how you'd write an abstract,
            but only for this step of the research.`
          })
          steps.push({
            selector: '#create-buttons',
            content: `Add to profile makes this work publicly accessible.
            You can still update it at any time and choose to add the newer version to your profile.
            It's OK if your work isn't completely finished yet, as long as you are ready to share! 😊

            Save as draft keeps this work just for you, until you decide to share it on your profile or with a link.
            
            If you want to create the next research step, you have to add this one to your profile first.
            One step at a time! If you're working on multiple steps at once,
            then perhaps they don't follow from each other... 
            Or perhaps the first step is "ready enough" to go online?`
          })
          return steps
        })()}
        isOpen={isTourOpen}
        onRequestClose={() => setIsTourOpen(false)}
      />
    </>
  )
}

export default Create
