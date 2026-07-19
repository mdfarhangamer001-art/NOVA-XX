import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import firebaseConfig from '../../../../firebase-applet-config.json'

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export const googleAuthProvider = new GoogleAuthProvider()
// Add Google scopes for reading and sending Gmail emails
googleAuthProvider.addScope('https://mail.google.com/')
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.modify')
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.send')
