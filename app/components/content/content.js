import React, { useState, useEffect, useContext } from 'react'
import styled from 'styled-components'
import { green, yellow, red, gray } from '../../lib/colors'
import { encode } from 'dat-encoding'
import { Button, Title } from '../layout/grid'
import { useHistory, Link } from 'react-router-dom'
import Anchor from '../anchor'
import Arrow from '../icons/arrow.svg'
import { remote } from 'electron'
import { promises as fs } from 'fs'
import AdmZip from 'adm-zip'
import { Label } from '../forms/forms'
import subtypes from '@hypergraph-xyz/wikidata-identifiers'
import newlinesToBr from '../../lib/newlines-to-br'
import { ProfileContext, TourContext } from '../../lib/context'
import Tour from '../tour/tour'
import isContentRegistered from '../../lib/is-content-registered'
import Share from '../icons/share.svg'
import ShareModal from './share-modal'
import Tabbable from '../accessibility/tabbable'
import { Heading1 } from '../typography'

const Container = styled.div`
  margin: 2rem;
`
const BackArrow = styled(Arrow)`
  transform: rotate(270deg);
  display: block;
  margin-bottom: 2rem;
`
const Parent = styled(Anchor)`
  margin-bottom: 2rem;
`
const AuthorWithContentRegistration = styled(Anchor)`
  font-size: 1.5rem;
`
const AuthorWithoutContentRegistration = styled.span`
  color: ${gray};
  display: inline-block;
  font-size: 1.5rem;
  margin-bottom: 2px;
`
const Description = styled.div`
  margin-top: 2rem;
  margin-bottom: 1.5rem;
`
const NoMain = styled.div`
  margin-bottom: 1rem;
`
const File = styled.div`
  width: 100%;
  border: 2px solid ${green};
  line-height: 2;
  padding-left: 0.5rem;
  padding-right: 1rem;
  max-width: 40rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  :not(:last-of-type) {
    margin-bottom: 0.5rem;
  }

  :hover {
    background-color: ${green};
  }
  :active {
    background-color: inherit;
  }
`
const Actions = styled.div`
  margin-top: 2rem;
`

const ExportZip = ({ directory }) => (
  <Button
    onClick={async () => {
      const zip = new AdmZip()
      const files = await fs.readdir(directory)
      for (const path of files) {
        zip.addLocalFile(`${directory}/${path}`)
      }
      const { filePath } = await remote.dialog.showSaveDialog(
        remote.getCurrentWindow(),
        {
          defaultPath: 'content.zip'
        }
      )
      if (filePath) zip.writeZip(filePath)
    }}
    id='content-export'
  >
    Export .zip
  </Button>
)

const getContentDirectory = async content => {
  const directory = `${remote.app.getPath('home')}/.p2pcommons/${encode(
    content.rawJSON.url
  )}`
  try {
    const directoryWithVersion = `${directory}+${content.metadata.version}`
    await fs.stat(directoryWithVersion)
    return directoryWithVersion
  } catch (_) {
    return directory
  }
}

const Content = ({ p2p, content, renderRow }) => {
  const [directory, setDirectory] = useState()
  const [authors, setAuthors] = useState()
  const [parents, setParents] = useState()
  const [files, setFiles] = useState()
  const [isDeleting, setIsDeleting] = useState()
  const [isUpdatingRegistration, setIsUpdatingRegistration] = useState()
  const [canRegisterContent, setCanRegisterContent] = useState()
  const [canDeregisterContent, setCanDeregisterContent] = useState()
  const [isSharing, setIsSharing] = useState()
  const { tour: [isTourOpen, setIsTourOpen] } = useContext(TourContext)
  const history = useHistory()
  const { url: profileUrl } = useContext(ProfileContext)

  useEffect(() => {
    ;(async () => {
      const directory = await getContentDirectory(content)
      setDirectory(directory)
      await fetchFiles(directory)
    })()
  }, [content.rawJSON.url])

  const fetchAuthors = async () => {
    const authors = await Promise.all(
      content.rawJSON.authors.map(key =>
        p2p.clone(encode(key), null, /* download */ false)
      )
    )
    setAuthors(authors)
  }

  const fetchParents = async () => {
    const parents = await Promise.all(
      content.rawJSON.parents.map(url =>
        p2p.clone(encode(url.split('+')[0]), null, /* download */ false)
      )
    )
    setParents(parents)
  }

  const fetchFiles = async directory => {
    const files = await fs.readdir(directory)
    setFiles(files.filter(path => path !== 'index.json'))
  }

  const fetchCanRegisterOrDeregisterContent = async () => {
    const profile = authors.find(
      author => encode(author.rawJSON.url) === encode(profileUrl)
    )
    if (profile) {
      setCanRegisterContent(!isContentRegistered(content, profile))
      setCanDeregisterContent(isContentRegistered(content, profile))
    } else {
      setCanRegisterContent(false)
      setCanDeregisterContent(false)
    }
  }

  useEffect(() => {
    fetchAuthors()
    fetchParents()
  }, [content.rawJSON.url])

  useEffect(() => {
    if (authors) fetchCanRegisterOrDeregisterContent()
  }, [authors])

  const supportingFiles = files
    ? files.filter(file => file !== content.rawJSON.main)
    : []

  return authors && parents ? (
    <>
      {isSharing && (
        <ShareModal
          url={
            authors.find(author => isContentRegistered(content, author))
              ? `${content.rawJSON.url}+${content.metadata.version}`
              : content.rawJSON.url
          }
          onClose={() => setIsSharing(false)}
        />
      )}
      {renderRow(
        <>
          <Title id='content-subtype'>{subtypes[content.rawJSON.subtype] || 'Content'}</Title>
          {content.rawJSON.main && (
            <Button
              content='icon'
              type='button'
              onClick={() => setIsSharing(true)}
              id='content-share'
            >
              <Share />
            </Button>
          )}
          <Button onClick={() => remote.shell.openPath(directory)} id='content-openfolder'>
            Open folder
          </Button>
          <ExportZip directory={directory} />
        </>
      )}
      <Container>
        <Tabbable component={BackArrow} onClick={() => history.go(-1)} />
        <div id='#content-parents'>
          {parents.map(parent => (
            <Link
              component={Parent}
              key={`${parent.rawJSON.url}+${parent.rawJSON.version}`}
              to={`/profiles/${encode(parent.rawJSON.authors[0])}/${encode(
                parent.rawJSON.url
              )}`}
            >
              {parent.rawJSON.title}
            </Link>
          ))}
        </div>
        <Heading1>{content.rawJSON.title}</Heading1>
        {authors.map(author => {
          return isContentRegistered(content, author) ? (
            <Link
              component={AuthorWithContentRegistration}
              key={author.rawJSON.url}
              to={`/profiles/${encode(author.rawJSON.url)}`}
            >
              {author.rawJSON.title}
            </Link>
          ) : (
            <AuthorWithoutContentRegistration key={author.rawJSON.url}>
              {author.rawJSON.title}
            </AuthorWithoutContentRegistration>
          )
        })}
        <Description>{newlinesToBr(content.rawJSON.description)}</Description>
        <div id='content-files'>
          <Label>Main file</Label>
          {content.rawJSON.main ? (
            <Tabbable
              component={File}
              onClick={() => {
                remote.shell.openPath(`${directory}/${content.rawJSON.main}`)
              }}
            >
              {content.rawJSON.main}
            </Tabbable>
          ) : (
            <NoMain>Required for adding to profile and sharing</NoMain>
          )}
          {supportingFiles.length > 0 && (
            <>
              <Label>Supporting Files</Label>
              <div>
                {supportingFiles.map(path => (
                  <Tabbable
                    component={File}
                    key={path}
                    onClick={() => {
                      remote.shell.openPath(`${directory}/${path}`)
                    }}
                  >
                    {path}
                  </Tabbable>
                ))}
              </div>
            </>
          )}
        </div>
        <Actions>
          {canRegisterContent ? (
            <Button
              color={green}
              isLoading={isUpdatingRegistration}
              disabled={!content.rawJSON.main}
              onClick={async () => {
                setIsUpdatingRegistration(true)
                try {
                  await p2p.register(
                    [
                      encode(content.rawJSON.url),
                      content.metadata.version
                    ].join('+'),
                    profileUrl
                  )
                } finally {
                  setIsUpdatingRegistration(false)
                }
                await fetchAuthors()
              }}
              id='content-register'
            >
              Add to profile
            </Button>
          ) : canDeregisterContent ? (
            <Button
              color={yellow}
              isLoading={isUpdatingRegistration}
              onClick={async () => {
                setIsUpdatingRegistration(true)
                try {
                  await p2p.deregister(
                    [
                      encode(content.rawJSON.url),
                      content.metadata.version
                    ].join('+'),
                    profileUrl
                  )
                } finally {
                  setIsUpdatingRegistration(false)
                }
                await fetchAuthors()
              }}
              id='content-deregister'
            >
              Remove from profile
            </Button>
          ) : null}
          {content.metadata.isWritable && (
            <Button
              color={red}
              isLoading={isDeleting}
              onClick={async () => {
                const { response } = await remote.dialog.showMessageBox(
                  remote.getCurrentWindow(),
                  {
                    type: 'warning',
                    buttons: ['Delete files', 'Cancel'],
                    message:
                      'This will also delete these files from your Hypergraph folder. Are you sure you want to delete this content?'
                  }
                )
                if (response === 1) return

                setIsDeleting(true)
                const deleteFiles = true
                await p2p.delete(content.rawJSON.url, deleteFiles)
                history.push('/')
              }}
              id='content-delete'
            >
              Delete content
            </Button>
          )}
        </Actions>
      </Container>
      <Tour
        steps={(() => {
          const steps = []
          if (content.metadata.isWritable) {
            steps.push({
              content: `Congratulations, you're now looking at your own work in Hypergraph!
              Let's click through all the different features on this page.`
            })
          } else {
            steps.push({
              content: `You're now reading someone else's work on Hypergraph!
              Let's click through all the different features on this page.`
            })
            steps.push({
              selector: '#content-subtype',
              content: 'The type of information contained.'
            })
          }
          if (parents.length > 0) {
            steps.push({
              selector: '#content-parents',
              content: `This shows which research steps directly preceded this one.
              Hover to see what content this follows from and click to go to that content.

              We're working on expanding this so you can navigate back and forth
              and view a larger map displaying multiple levels of connections.`
            })
          }
          if (!content.metadata.isWritable) {
            steps.push({
              selector: '#content-files',
              content: `You can click on the files to directly open them.
              The Main file is the most important one and generally where you should start.`
            })
          }
          steps.push({
            selector: '#content-share',
            content: 'Like with profiles, you can share links directly to content.'
          })
          if (content.metadata.isWritable) {
            steps.push({
              selector: '#content-openfolder',
              content: `This opens the folder on your computer, so you can easily make updates to your work.
              Please note that the files are read-only if you're looking at an older version.`
            })
          } else {
            steps.push({
              selector: '#content-openfolder',
              content: `This opens the folder on your computer.
              Please note that the files are read-only by default for other people's content.
              If you want to make changes, you should copy the files elsewhere.`
            })
          }
          steps.push({
            selector: '#content-export',
            content: 'This exports the content as a ZIP archive.'
          })
          if (content.metadata.isWritable) {
            if (canRegisterContent) {
              steps.push({
                selector: '#content-register',
                content: `The Add to profile button makes the content available to everyone who has your profile link.
                You can always choose to update it later or remove it from your profile.`
              })
            }
            if (canDeregisterContent) {
              steps.push({
                selector: '#content-deregister',
                content: `The Remove from profile button updates your profile to remove this piece of content.
                This doesn't make it inaccessible to others, but does make it harder for others to find.`
              })
            }
            steps.push({
              selector: '#content-delete',
              content: `This deletes this content from your profile and your computer.
              It has no effect on other people's computers, so it may remain accessible if others also have this content.`
            })
            if (canRegisterContent) {
              steps.push({
                selector: '#menu-drafts',
                content: 'Now, shall we take a look at your drafts to see how this content looks there?'
              })
            }
            if (canDeregisterContent) {
              steps.push({
                selector: '#menu-profile',
                content: 'Now, shall we take a look at your profile to see how this content looks there?'
              })
            }
          }
          return steps
        })()}
        isOpen={isTourOpen}
        onRequestClose={() => setIsTourOpen(false)}
      />
    </>
  ) : null
}

export default Content
