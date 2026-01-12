import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

export async function uploadImage(file: File | Buffer, folder: string = "brokers") {
  try {
    let buffer: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      buffer = file
    }
    const base64 = buffer.toString("base64")
    const dataURI = `data:image/jpeg;base64,${base64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: "image",
      transformation: [
        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    }
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error)
    throw error
  }
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string
  format?: string
}) {
  return cloudinary.url(publicId, {
    ...options,
    secure: true,
  })
}

