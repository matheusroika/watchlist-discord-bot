import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: String,
  username: String,
  avatar: String,
  discriminator: String,
  public_flags: Number,
  flags: Number,
  banner: String,
  banner_color: String,
  accent_color: Number,
  locale: String,
  mfa_enabled: Boolean,
});

const User = mongoose.model("User", userSchema);
export default User;
