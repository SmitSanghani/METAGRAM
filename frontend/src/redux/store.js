import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice.js';
import postSlice from './postSlice.js';
import chatSlice from './chatSlice.js';
import socketSlice from './socketSlice.js';
import notificationSlice from './notificationSlice.js';
import reelSlice from './reelSlice.js';

import {
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'


const persistConfig = {
    key: 'root',
    version: 1,
    storage,
    blacklist: ['socketio']
}

const rootReducer = combineReducers({
    auth: authSlice,
    post: postSlice,
    chat: chatSlice,
    socketio: socketSlice,
    notification: notificationSlice,
    reel: reelSlice,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)


const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, 'socketio/setSocket'],
                ignoredPaths: ['socketio.socket'],
            },
        }),
});

export default store;