import { ComplaintList } from '../../components/ComplaintList.jsx';

export default function ManageComplaints() {
  return (
    <ComplaintList
      variant="admin"
      title="Manage complaints"
      description="Every complaint in the system. Open one to assign it, retune priority or change its status."
    />
  );
}
