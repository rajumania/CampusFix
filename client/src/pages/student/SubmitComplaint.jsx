import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintApi } from '../../services/endpoints.js';
import { getFieldErrors, getMessage } from '../../services/api.js';
import { PageHeader } from '../../components/StatCard.jsx';
import { CATEGORIES, PRIORITIES } from '../../utils/constants.js';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

const INITIAL = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  location: '',
};

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [form, setForm] = useState(INITIAL);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const [previews, setPreviews] = useState([]);

  // Object URLs only exist for the current file list, so each change revokes
  // the previous batch instead of leaking a blob reference per keystroke.
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(files.map((file, index) => ({ file, url: urls[index] })));
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    const accepted = [];
    const rejected = [];

    for (const file of incoming) {
      if (!ACCEPTED.includes(file.type)) rejected.push(`${file.name}: not a JPG, PNG or WebP`);
      else if (file.size > MAX_BYTES) rejected.push(`${file.name}: larger than 5 MB`);
      else accepted.push(file);
    }

    const combined = [...files, ...accepted];
    if (combined.length > MAX_FILES) {
      rejected.push(`Only ${MAX_FILES} photographs may be attached`);
    }

    setFiles(combined.slice(0, MAX_FILES));
    if (rejected.length) toast.error(rejected[0]);
    // Reset the input so choosing the same file again still fires change.
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 5) next.title = 'Give the complaint a title of at least 5 characters';
    if (form.description.trim().length < 15) {
      next.description = 'Describe the problem in at least 15 characters so staff know what to expect';
    }
    if (!form.category) next.category = 'Choose the category that fits best';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') payload.append(key, value);
      });
      files.forEach((file) => payload.append('images', file));

      const complaint = await complaintApi.create(payload);
      toast.success('Complaint submitted');
      navigate(`/complaints/${complaint._id}`);
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getMessage(err, 'Could not submit the complaint'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Submit a campus complaint"
        description="The more specific you are, the faster the right person can be assigned."
      />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-5 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="title">
                Complaint title
              </label>
              <input
                id="title"
                className="input"
                value={form.title}
                onChange={set('title')}
                placeholder="Seminar hall projector not powering on"
                maxLength={120}
              />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
            </div>

            <div>
              <label className="label" htmlFor="description">
                What is the problem?
              </label>
              <textarea
                id="description"
                rows={6}
                className="input"
                value={form.description}
                onChange={set('description')}
                placeholder="Describe what is wrong, when it started and how many people it affects."
                maxLength={2000}
              />
              <div className="mt-1 flex justify-between">
                {errors.description ? (
                  <p className="text-xs text-rose-600">{errors.description}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-400">{form.description.length}/2000</p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="location">
                Where is it? (optional)
              </label>
              <input
                id="location"
                className="input"
                value={form.location}
                onChange={set('location')}
                placeholder="Hostel Wing C, first floor"
                maxLength={100}
              />
            </div>
          </div>

          <div className="card p-5">
            <label className="label">Photographs (up to {MAX_FILES}, 5 MB each)</label>
            <input
              ref={inputRef}
              id="images"
              type="file"
              accept={ACCEPTED.join(',')}
              multiple
              onChange={handleFiles}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />

            {previews.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previews.map((preview, index) => (
                  <li key={`${preview.file.name}-${index}`} className="group relative">
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-24 w-full rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${preview.file.name}`}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white opacity-90 hover:bg-rose-600"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Photos stay on your device until you press submit. JPG, PNG or WebP only.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" className="input" value={form.category} onChange={set('category')}>
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-rose-600">{errors.category}</p>}
            </div>

            <div>
              <label className="label" htmlFor="priority">
                How urgent is it?
              </label>
              <select id="priority" className="input" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Choose critical only when the issue is a safety risk or stops a class.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </button>
            <button type="button" className="btn-secondary mt-2 w-full" onClick={() => navigate('/student')}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
