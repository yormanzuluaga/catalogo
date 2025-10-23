const { Schema, model } = require("mongoose");

const userSchema = Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
      required: [true, "First name is required"],
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    countryCode: {
      type: String,
      required: [true, "country Code is required"],
    },
    mobile: {
      type: String,
      required: [true, "mobile is required"],
    },
    avatar: {
      type: String,
    },
    rol: {
      type: String,
      required: true,
      emun: [
        "ADMIN_ROLE",
        "USER_ROLE",
        "COMPANY_ROLE",
        "SUPPORTS_ROLE",
      ],
    },

    estado: {
      type: Boolean,
      default: true,
    },
    google: {
      type: Boolean,
      default: false,
    },
    apple: {
      type: Boolean,
      default: false,
    },
    facebook: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.methods.toJSON = function () {
  const { password, _id, ...user } = this.toObject();
  user.uid = _id;
  return user;
};

module.exports = model("User", userSchema);
