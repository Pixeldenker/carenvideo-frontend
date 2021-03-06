<template>
  <div class="home">
      <div v-show="showCallModal" id="modal" class="modal">
        <div class="modal-content">
            <div class="person-calling-image">
                <img src="../assets/images/person-icon.svg" alt="">
            </div>
             <div class="message">
                <span class="message-top">{{modalPersonName}}</span>
                <span class="message-under">belt. Wil je...</span>
                <div class="buttons">
                    <div class="btn-accept" @click="acceptCall">
                        Opnemen
                    </div>
                    <div class="btn-ignore" @click="declineCall">
                        Weigeren
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button class="button-primary calendar-button" @click="$router.push('/kalender')">Naar kalender</button>

    <div class="contacts">
      <div class="greeting">
        <span class="greeting-top">Goedemorgen {{currentUser.first_name}},</span>
        <span class="greeting-under">wie wil je vandaag bellen?</span>
      </div>
      <div class="persons-container">
        <Person :person="person" v-if="usersPeople" v-for="person in usersPeople" :key="person.id"/>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Pusher from 'pusher-js'
import Hashids from 'hashids'
import variables from '@/variables'

import Person from '@/components/home/Person.vue'

export default {
  name: 'home',
  components: {
    Person
  },
  data () {
    return {
      registredServiceWorker: null,
      onlineUsers: [],
      showCallModal: false,
      modalPersonName: '',
      calledById: '',
      roomLink: ''
    }
  },
  computed: {
    /**
     * Gets token from the store
     * @returns {String} token
     */
    token () {
      return this.$store.getters.getToken
    },

    /**
     * Gets user id from the store
     * @returns {Number} person_id
     */
    getCurrentUserId () {
      return this.$store.getters.getCurrentUser.person_id
    },

    /**
     * Gets allUser Pusher channel from the store
     * @returns {Object} allUsersChannel
     */
    getAllUsersPusher () {
      return this.$store.getters.getAllUsersChannel
    },

    /**
     * Gets current user object from the store if it exists
     * else returns an empty first_name and last_name object
     * @returns {Object} person
     */
    currentUser () {
      if (this.$store.getters.getCurrentUser._embedded) {
        return this.$store.getters.getCurrentUser._embedded.person
        
      } else {
        return {
          first_name: '',
          last_name: ''
        }
      }
    },

    /**
     * Gets people array that belongs to the the current user
     * @returns {Array} people
     */
    usersPeople () {
      if (this.$store.getters.getUsersPeople._embedded) {
        return this.$store.getters.getUsersPeople._embedded.items.filter(user => user.id !== this.$store.getters.getCurrentUser.person_id)
      } else {
        return []
      }
    }
  },
  methods: {
    /**
     * Redirects the user to the calling room
     */
    acceptCall () {
      this.$router.push(this.roomLink)
    },

    /**
     * Declines call and hides call modal
     */
    declineCall () {
      this.showCallModal = false
      this.getAllUsersPusher.trigger('client-decline-call-event', {
        id: this.calledById
      })
    },

    /**
     * @returns {axios} axios get request with the user endpoint and headers
     */
    getCurrentUser () {
      return axios.get(variables.userEndpoint, {
        headers: { 
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        }
      })
    },

    /**
     * @returns {axios} axios get request with the people endpoint and headers
     */
    getPeople () {
      return axios.get(variables.peopleEndpoint, {
        headers: { 
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        }
      })
    },

    /**
     * Initialize Pusher and add event listeners
     * @param {Number} id
     * @param {Number} channelNameId
     */
    initializePusher (id, channelNameId) {
      let presencePusher = new Pusher('8dc95d49e9a8f15e0980', {
        cluster: 'eu',
        encrypted: true,
        authEndpoint: variables.pusherPresence,
        auth: {
          params: { id: id }
        }
      })

      this.$store.dispatch('initPresencePusher', {
        pusher: presencePusher
      })

      let channelNamePrefix = 'presence-all-'
      let channelnameSuffix = (channelNameId) ? channelNameId.toString() : id.toString()

      let allUsersChannel = this.$store.getters.getPresencePusherInstance.subscribe(channelNamePrefix + channelnameSuffix)

      this.$store.dispatch('initAllUsersChannel', {
        channel: allUsersChannel
      })

      allUsersChannel.bind('pusher:subscription_succeeded', (members) => {
        members.each(member => {
          this.$store.dispatch('addOnlineMember', {
            memberId: member.id
          })
        })
      })

      allUsersChannel.bind('client-call-event', (data) => {
        if (data.id === this.getCurrentUserId) {
          this.showCallModal = true
          
          let calledBy = this.usersPeople.find(person => person.id === data.called_by)
          this.modalPersonName = calledBy.first_name + " " + calledBy.last_name

          this.$store.dispatch('addCalledById', {
            id: calledBy.id
          })

          this.calledById = calledBy.id

          
          let idLink = new Hashids().encode(id)
          this.roomLink = `room/${idLink}`
        }
      })

      allUsersChannel.bind('client-stop-call-event', (data) => {
        if (data.id === this.getCurrentUserId) {  
          this.showCallModal = false
        }
      })

      allUsersChannel.bind('pusher:member_added', (member) => {
        this.$store.dispatch('addOnlineMember', {
          memberId: member.id
        })
      })

      allUsersChannel.bind('pusher:member_removed', (member) => {
        this.$store.dispatch('removeOnlineMember', {
          memberId: member.id
        })
      })
    },

    /**
     * Casts a url base64 to a UInt8 Array
     * @returns {Array} outputArray
     */
    urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    },

    /**
     * Get notification permission state
     * @returns {Object} notification permission state
     * @returns {Object} permission
     */
    getNotificationPermissionState () {
      if (navigator.permissions) {
        return navigator.permissions.query({name: 'notifications'})
        .then(result => {
          return result.state
        })
      }

      return new Promise(resolve => {
        resolve(Notification.permission)
      })
    },

    /**
     * Globally register a service worker from service-worker.js
     * and asks for permission
     */
    registerServiceWorker () {
      this.registredServiceWorker = navigator.serviceWorker.register('service-worker.js', { scope: '/' })
      return this.registredServiceWorker
      .then(registration => {
        return this.askPermission()
        .then(this.subscribeUserToPush())
      })
      .catch(error => {
        console.error('Unable to register service worker', error)
      })
    },

    /**
     * Prompts the user for permission to show notifications
     * @throws {Error} Permission was not granted
     */
    askPermission () {
      return new Promise((resolve, reject) => {
        const permissionResult = Notification.requestPermission(result => {
          resolve(result)
        })

        if (permissionResult) {
          permissionResult.then(resolve, reject)
        }
      })
      .then(permissionResult => {
        if (permissionResult !== 'granted') {
          throw new Error('Permission was not granted')
        }
      })
    },

    /**
     * Subscribes the user to push notifications
     */
    subscribeUserToPush () {
      return this.registredServiceWorker
      .then(registration => {
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            variables.applicationServerKey
          )
        }

        return registration.pushManager.subscribe(subscribeOptions)
      })
      .then(pushSubscription => {
        this.sendSubscriptionToBackend(pushSubscription)
        return pushSubscription
      })
    },

    /**
     * Sends the subscription to the backend to save it to the database
     * @returns {Object} server response
     * @throws {Error} Bad status code from server
     */
    sendSubscriptionToBackend(subsciption) {
      let bundledSub = JSON.parse(JSON.stringify(subsciption))

      return axios({
        method: 'POST',
        url: variables.pushSubEndpoint,
        headers: {'Content-Type': 'application/json'},
        data: {
          user_id: this.$store.getters.getCurrentUser.person_id,
          endpoint: bundledSub.endpoint,
          keys: {
            auth: bundledSub.keys.auth,
            p256dh: bundledSub.keys.p256dh
          }
        }
      })
      .then(response => {
        if (!response.status === 200) {
          throw new Error('Bad status code from server')
        }

        return response

      })
      .then(responseData => {
        if (!(responseData.data && responseData.data.data.success)) {
          throw new Error('Bad response from server.')
        }
      })
      .catch(err => {
        console.error('Error saving subscription', err)
      })
    }
  },
  /**
   * If token is set, get data from Carenzorgt.nl, initialize Pusher and register service worker.
   * If no token is set, redirect to Carenzorgt.nl to authenticate.
   */
  created () {
    if (this.token) {
      axios.all([this.getCurrentUser(), this.getPeople()])
      .then(axios.spread((currentUser, people) => {
        this.$store.dispatch('addPeople', {
          currentUser: currentUser.data,
          people: people.data
        })

        this.initializePusher(currentUser.data.person_id, currentUser.data._embedded.person.owner_id)

        if (('serviceWorker' in navigator) && ('PushManager' in window)) {
          this.registerServiceWorker()
        } else {
          console.log('BROWSER DOES NOT SUPPORT PUSH NOTIFICATIONS')
        }
      }))
      .catch(err => {
        console.log('err', err)
        window.location = "https://www.carenzorgt.nl/login/oauth/authorize?response_type=token&client_id=" + variables.clientId + "&redirect_uri=" + variables.redirectUri + "&scope=user.read+calendar.read+care_givers.read"
      })
    }
  }
}
</script>

<style lang="scss" scoped>
    @import '../assets/styles/all';

    .home {
      .calendar-button {
        position: absolute;
        top: 20px;
        right: 20px;
      }
    }

    .modal {
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto; 
        background-color: rgb(0,0,0);
        background-color: rgba(0,0,0,0.4);
    }
    .buttons {
        display: inline-flex;
        width: 100%;
    }
    .modal-content {
        background: $caren-gradient-right;
        margin: 4% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        height: 80vh;
        font-family: 'Lato';
        color: $white;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-gap: 10px;
        grid-auto-rows: minmax(100px, auto);
        border: solid 1px;
        border-radius: 6px;
        box-shadow: 10px 10px 10px 0 rgba(0, 0, 0, 0.12);
        .person-calling-image {
            position: relative;
            text-align: center;
            box-shadow: inset 10px 10px 10px 0 rgba(0, 0, 0, 0.04);
            border: solid 7px $white; 
            min-height: 100px;
            min-width: 100px;
            background-color: $image-color;
            border-radius: 50%;
            display: inline-block;
            height: 220px !important;
            width: 220px !important;
            margin: auto;
            margin-right: 20px;
            img {
                top: 50%;
                left: 50%;
                width: 90px;
                height: 90px;
                margin-top: 60px;
            }
        }
    }
    .message {
        margin: auto;
        margin-left: 20px;
        span {
            display: block;
        }
        .message-top {
            font-family: 'Open Sans';
            font-size: 3em;
            font-weight: bold;
            font-style: normal;
            font-stretch: normal;
            line-height: normal;
            letter-spacing: normal;
            color: #ffffff;
        }
        .message-under {
            font-family: 'Open Sans';
            font-size: 3em;
            font-weight: bold;
            font-style: normal;
            font-stretch: normal;
            line-height: normal;
            letter-spacing: normal;
            color: #ffffff;
            margin-bottom: 20px;
        }
    }
    .greeting {
        font-family: 'Open Sans', sans-serif;
        font-weight: 600;
        color: white;
        font-size: 3.5em;
        display: inline-grid;
        margin-bottom: 50px;
        .greeting-under {
            width: 570px;
            height: 60px;
            font-family: 'Lato';
            font-size: 35px;
            font-weight: 400;
            color: #ffffff;
            text-align: center;
        }
    }
    .persons-container {
        text-align: center;
        display: grid;
        margin: 0 auto;
        grid-row-gap: 20px;
        grid-template-columns: repeat(2, 1fr);
        @include breakpoint(sm) {
            grid-template-columns: repeat(1, 1fr);
        }
    }
</style>

