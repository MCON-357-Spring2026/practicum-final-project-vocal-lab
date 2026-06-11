import { useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { createProject } from "../api/projects";

import { UPLOAD_TYPES } from "../api/projectContract";



const ACCEPT = "audio/*,.mp3,.wav,.ogg,.m4a,.flac,.webm";



export default function ProjectUpload({ onProjectCreated }) {

  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const pendingUploadType = useRef(null);



  const [uploading, setUploading] = useState(false);

  const [uploadType, setUploadType] = useState(null);

  const [error, setError] = useState(null);



  const openFilePicker = (type) => {

    pendingUploadType.current = type;

    setUploadType(type);

    setError(null);

    fileInputRef.current?.click();

  };



  const handleFileChange = async (event) => {

    const file = event.target.files?.[0];

    const type = pendingUploadType.current;

    event.target.value = "";



    if (!file || !type) return;



    setUploading(true);

    setError(null);



    try {

      const project = await createProject(file, type);

      onProjectCreated?.(project);

      navigate(`/projects/${project.project_id}`);

    } catch (err) {

      setError(err.message);

    } finally {

      setUploading(false);

      setUploadType(null);

      pendingUploadType.current = null;

    }

  };



  const uploadLabel =
    uploadType === UPLOAD_TYPES.FULL_SONG
      ? "Uploading full song…"
      : uploadType === UPLOAD_TYPES.INSTRUMENTAL
        ? "Uploading instrumental…"
        : null;



  return (

    <section>

      <h2 className="neon-label">Start a new project</h2>

      <p className="msg-muted">

        Upload a full song, then use <strong>Remove vocals</strong> and <strong>Detect key</strong> on the project page — or upload an instrumental to skip vocal removal.

      </p>



      <input

        ref={fileInputRef}

        type="file"

        accept={ACCEPT}

        onChange={handleFileChange}

        hidden

      />



      <div className="btn-row">

        <button

          type="button"

          className="btn-primary"

          onClick={() => openFilePicker(UPLOAD_TYPES.FULL_SONG)}

          disabled={uploading}

        >

          Upload full song

        </button>

        <button

          type="button"

          className="btn-secondary"

          onClick={() => openFilePicker(UPLOAD_TYPES.INSTRUMENTAL)}

          disabled={uploading}

        >

          Upload instrumental

        </button>

      </div>



      {uploading && uploadLabel && <p className="spinner-line">{uploadLabel}</p>}

      {error && <p className="msg-error">{error}</p>}

    </section>

  );

}

