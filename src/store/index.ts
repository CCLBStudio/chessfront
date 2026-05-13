import { configureStore, combineReducers } from '@reduxjs/toolkit';
import playerArmyReducer from './slices/playerArmy';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const isServer = typeof window === 'undefined';

const storageConfig = isServer
    ? {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
    }
    : storage;

const rootReducer = combineReducers({
    playerArmy: playerArmyReducer
});

const persistConfig = {
    key: 'root',
    storage: storageConfig,
    whitelist: ['playerArmy']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);