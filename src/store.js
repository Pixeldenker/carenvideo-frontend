import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    token: '',
    currentUser: {},
    usersPeople: {},
    presencePusher: null,
    privatePusher: null,
    allUsersChannel: null,
    privateChannel: null
  },
  getters: {
    getToken: state => {
      // TODO: If token is expired: redirect to https://www.carenzorgt.nl/person/me/apps
      if (localStorage.getItem('carenvideo-token')) {
        return localStorage.getItem('carenvideo-token')
      } else {
        return state.token
      }
    },

    getCurrentUser: state => {
      return state.currentUser
    },

    getUsersPeople: state => {
      return state.usersPeople
    },

    getPresencePusherInstance: state => {
      return state.presencePusher
    },

    getPrivatePusherInstance: state => {
      return state.presencePusher
    },

    getAllUsersChannel: state => {
      return state.allUsersChannel
    },

    getPrivateChannel: state => {
      return state.privateChannel
    }
  },
  mutations: {
    ADD_TOKEN (state, payload) {
      state.token = payload.token
    },

    ADD_CURRENT_USER (state, payload) {
      state.currentUser = payload.user
    },

    ADD_USERS_PEOPLE (state, payload) {
      state.usersPeople = payload.people
    },

    INIT_PRESENCE_PUSHER (state, payload) {
      state.presencePusher = payload.pusher
    },

    INIT_PRIVATE_PUSHER (state, payload) {
      state.privatePusher = payload.pusher
    },

    INIT_ALL_USERS_CHANNEL (state, payload) {
      state.allUsersChannel = payload.channel
    },

    INIT_PRIVATE_CHANNEL (state, payload) {
      state.privateChannel = payload.channel
    }
  },
  actions: {
    addToken ({commit}, payload) {
      localStorage.setItem('carenvideo-token', payload.token)
      commit('ADD_TOKEN', payload)
    },

    addCurrentUser({commit}, payload) {
      commit('ADD_CURRENT_USER', {
        user: payload.currentUser
      })
    },

    addPeople ({commit}, payload) {
      commit('ADD_CURRENT_USER', {
        user: payload.currentUser
      })

      commit('ADD_USERS_PEOPLE', {
        people: payload.people
      })
    },

    initPresencePusher ({commit}, payload) {
      commit('INIT_PRESENCE_PUSHER', payload)
    },

    initPrivatePusher ({commit}, payload) {
      commit('INIT_PRIVATE_PUSHER', payload)
    },

    initAllUsersChannel ({commit}, payload) {
      commit('INIT_ALL_USERS_CHANNEL', payload)
    },

    initPrivateChannel ({commit}, payload) {
      commit('INIT_PRIVATE_CHANNEL', payload)
    }
  }
})
