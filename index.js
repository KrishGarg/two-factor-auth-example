/*
  Comments in this file will be to mark wherever you
  will have to add things in a real world app. I skipped a 
  lot of side-stuff to save time.
*/

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const speakeasy = require("speakeasy");
const cleanup = require("async-exit-hook");
const qrcode = require("qrcode");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.post("/api/createuser", async (req, res) => {
  // Use proper login and password with hashing.
  const user = await prisma.user.create({ data: {} });
  return res.json({
    ...user,
    success: true,
  });
});

app.post("/api/twofactor/add", async (req, res) => {
  // Check if it's an authorized request
  // Check if the user exists.
  // Check if the user already has two factor setup.
  // Possibly you can use redis instead of main database to store temp secret.
  const tempSecret = speakeasy.generateSecret();
  await prisma.user.update({
    where: {
      id: req.body.id,
    },
    data: {
      auth_temp_secret: tempSecret.base32,
    },
  });

  // This will return a data string, which you can use as <img src={qrcodeData}> in the frontend.
  const qrcodeData = await qrcode.toDataURL(tempSecret.base32);

  return res.json({
    secret: tempSecret.base32,
    qrcode: qrcodeData,
  });
});

app.post("/api/twofactor/verifyadd", async (req, res) => {
  // Check if it's an authorized request
  // Check if the user exists.
  // Check if the user actually requested to add two factor.
  // Check if the body has 'token'
  const user = await prisma.user.findUnique({
    where: {
      id: req.body.id,
    },
  });

  const verified = speakeasy.totp.verify({
    secret: user.auth_temp_secret,
    encoding: "base32",
    token: req.body.token,
  });

  if (verified) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        auth_temp_secret: null,
        auth_secret: user.auth_temp_secret,
      },
    });
    return res.json({
      success: true,
    });
  } else {
    // Here if you want to, you can instead of resetting the operation, give user x amount of tries.
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        auth_temp_secret: null,
      },
    });
    return res.status(403).json({
      success: false,
    });
  }
});

app.post("/api/twofactor/verify", async (req, res) => {
  // Check if it's an authorized request
  // Check if the user exists.
  // Check if the body has 'token'
  const user = await prisma.user.findUnique({
    where: {
      id: req.body.id,
    },
  });

  const correctCode = speakeasy.totp.verify({
    secret: user.auth_secret,
    encoding: "base32",
    token: req.body.token,
  });

  if (correctCode) {
    return res.json({
      success: true,
    });
  } else {
    return res.status(403).json({
      success: false,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

cleanup(async () => {
  await prisma.$disconnect();
});
