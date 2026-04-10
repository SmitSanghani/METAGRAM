import { createSlice } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
    name: "settings",
    initialState: {
        postsEnabled: true,
        reelsEnabled: true,
        callingEnabled: true,
        loading: false,
    },
    reducers: {
        setPlatformSettings: (state, action) => {
            state.postsEnabled = action.payload.postsEnabled ?? state.postsEnabled;
            state.reelsEnabled = action.payload.reelsEnabled ?? state.reelsEnabled;
            state.callingEnabled = action.payload.callingEnabled ?? state.callingEnabled;
        },
        setSettingsLoading: (state, action) => {
            state.loading = action.payload;
        }
    }
});

export const { setPlatformSettings, setSettingsLoading } = settingsSlice.actions;
export default settingsSlice.reducer;
