import React, { useContext, useEffect, useState } from 'react'
import styled from 'styled-components'
import Logo from './logo.svg'
import { white, purple, black } from '../../lib/colors'
import { Row, Button } from '../layout/grid'
import { NavLink, useHistory, Link } from 'react-router-dom'
import AddContent from '../icons/add-content.svg'
import Search from './search-icon-1rem.svg'
import { encode } from 'dat-encoding'
import { ProfileContext } from '../../lib/context'
import NetworkStatusRed from './network-status-red.svg'
import NetworkStatusYellow from './network-status-yellow.svg'
import NetworkStatusGreen from './network-status-green.svg'
import isOnline from 'is-online'

const Container = styled.div`
  width: 8rem;
  border-right: 2px solid ${purple};
  padding-top: 3rem;
  position: fixed;
  height: 100%;
  top: 0;
  text-align: center;
  box-sizing: border-box;
`
const StyledLogo = styled(Logo)`
  margin-bottom: 2rem;
  -webkit-app-region: drag;
`
const StyledRow = styled(Row)`
  text-align: left;
  display: block;
`
const StyledButton = styled(Button)`
  color: ${white};
  background-color: ${black};
  text-align: left;
  width: 100%;
  padding-left: 12.5%;
  border-left-width: 0;
  border-top-width: 0;
  :hover {
    background-color: ${purple};
  }
  display: block;
  border-right-width: 2px !important;
  border-bottom-width: 2px !important;

  &.active {
    background-color: ${purple};
    :active {
      background-color: ${purple};
      color: ${white};
    }
  }
  :active {
    background-color: ${black};
    color: ${white} !important;
  }
`
const AddContentLink = styled(Link)`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 8rem;
  width: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    background-color: ${purple};
    cursor: default;
  }
  :active {
    background-color: inherit;
  }
`
const FindButton = styled(StyledButton)`
  position: absolute;
  bottom: 8rem;
  left: 0;
  height: 2rem;
  border-top-width: 2px;
`
const StyledSearch = styled(Search)`
  margin-right: 0.5rem;
`
const NetworkStatusContainer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 8rem;
  height: 9.5rem;
  padding-right: 0.5rem;
  padding-bottom: 0.5rem;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
`
const ButtonNavLink = ({ history, to, ...props }) => (
  <NavLink
    to={to}
    onClick={() => history.push(to)}
    component={StyledButton}
    {...props}
  />
)
const getNetworkStatus = async p2p => {
  if (!p2p.networker || !(await isOnline())) return 'red'
  if (!p2p.networker.swarm.holepunchable()) return 'yellow'
  return 'green'
}

const Menu = ({ p2p, onFind }) => {
  const history = useHistory()
  const { url: profileUrl } = useContext(ProfileContext)
  const [networkStatus, setNetworkStatus] = useState('red')

  useEffect(() => {
    let unmounted = false
    ;(async () => {
      const check = async () => {
        if (unmounted) return
        const status = await getNetworkStatus(p2p)
        if (unmounted) return
        if (status !== networkStatus) setNetworkStatus(status)
        setTimeout(check, 1000)
      }
      check()
    })()
    return () => {
      unmounted = true
    }
  }, [networkStatus])

  return (
    <Container>
      <StyledLogo onClick={() => history.push('/')} />
      <NetworkStatusContainer
        title={
          {
            green: 'Connected',
            yellow: 'Connection limited - hole punching unavailable',
            red: 'Disconnected'
          }[networkStatus]
        }
      >
        {networkStatus === 'green' ? (
          <NetworkStatusGreen />
        ) : networkStatus === 'yellow' ? (
          <NetworkStatusYellow />
        ) : (
          <NetworkStatusRed />
        )}
      </NetworkStatusContainer>
      <StyledRow>
        <ButtonNavLink to='/' exact history={history} id='menu-feed'>
          Feed
        </ButtonNavLink>
        <ButtonNavLink to='/drafts' history={history} id='menu-drafts'>
          Drafts
        </ButtonNavLink>
        <ButtonNavLink
          to={`/profiles/${profileUrl ? encode(profileUrl) : ''}`}
          history={history}
          id='menu-profile'
        >
          Profile
        </ButtonNavLink>
        <ButtonNavLink to='/following' history={history} id='menu-following'>
          Following
        </ButtonNavLink>
        <ButtonNavLink to='/tour/reopen' history={history} id='menu-reopen'>
          Reopen Tour
        </ButtonNavLink>
      </StyledRow>
      <FindButton onClick={onFind} id='menu-find'>
        <StyledSearch />
        Find
      </FindButton>
      <AddContentLink to='/create' id='menu-create'>
        <AddContent />
      </AddContentLink>
    </Container>
  )
}

export default Menu
