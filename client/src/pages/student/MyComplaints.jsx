import { Link } from 'react-router-dom';
import { ComplaintList } from '../../components/ComplaintList.jsx';

export default function MyComplaints() {
  return (
    <ComplaintList
      variant="student"
      title="My complaints"
      description="Every issue you have reported, newest first."
      action={
        <Link to="/student/complaints/new" className="btn-primary">
          + New complaint
        </Link>
      }
    />
  );
}
