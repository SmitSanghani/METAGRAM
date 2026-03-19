import { Setting } from "../models/setting.model.js";

export const getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({ postsEnabled: true });
        }
        return res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        console.error("Error in getSettings:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { postsEnabled } = req.body;
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({ postsEnabled });
        } else {
            settings.postsEnabled = postsEnabled;
            await settings.save();
        }
        return res.status(200).json({
            message: "Settings updated successfully",
            success: true,
            settings
        });
    } catch (error) {
        console.error("Error in updateSettings:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};
