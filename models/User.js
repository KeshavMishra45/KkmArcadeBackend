const mongoose = require('mongoose');

// Player IDs: 3-20 characters, lowercase letters, digits and underscore. Stored lowercase so "Naruto_1" and "naruto_1" are the same ID.
const ID_RE = /^[a-z0-9_]{3,20}$/;

const userSchema = new mongoose.Schema(
  {
    playerId:     { type: String, required: true, unique: true, lowercase: true, trim: true, match: ID_RE },
    passwordHash: { type: String, required: true, select: false },
    name:         { type: String, required: true, trim: true, maxlength: 24 },   // display name (can repeat, the ID can not)
    description:  { type: String, default: '', trim: true, maxlength: 140 },
    points:       { type: Number, default: 0, min: 0 },

    avatar:  { type: String, default: 'a1' },        // equipped avatar id
    banner:  { type: String, default: 'b1' },        // equipped banner id
    avatars: { type: [String], default: ['a1'] },    // owned avatar ids
    banners: { type: [String], default: ['b1'] },    // owned banner ids
  },
  { timestamps: true, autoIndex: false }   // indexes are created in config/db.js AFTER the email -> ID migration
);

// What the frontend is allowed to see (never the password hash)
userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    playerId: this.playerId,
    name: this.name,
    description: this.description,
    points: this.points,
    avatar: this.avatar,
    banner: this.banner,
    avatars: this.avatars,
    banners: this.banners,
  };
};

const User = mongoose.model('User', userSchema);
User.ID_RE = ID_RE;
module.exports = User;
