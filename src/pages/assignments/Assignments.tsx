import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { Assignment, Submission } from '../../lib/supabase';

type AssignmentWithSubmission = Assignment & {
  submission?: Submission | null;
};

const Assignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);

        const { data: assignmentsData, error: assignmentsError } =
          await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true });

        if (assignmentsError) throw assignmentsError;

        const { data: submissionsData, error: submissionsError } =
          await supabase
            .from('submissions')
            .select('*')
            .eq('user_id', user?.id);

        if (submissionsError) throw submissionsError;

        const assignmentsWithSubmissions = assignmentsData?.map(
          (assignment) => {
            const submission = submissionsData?.find(
              (sub) => sub.assignment_id === assignment.id
            );
            return { ...assignment, submission: submission || null };
          }
        );

        setAssignments(assignmentsWithSubmissions || []);
      } catch (error: any) {
        console.error('Error fetching assignments:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  const getAssignmentStatus = (assignment: AssignmentWithSubmission) => {
    if (assignment.submission?.status === 'submitted') return 'submitted';
    if (isPast(new Date(assignment.due_date))) return 'overdue';
    if (assignment.submission?.status === 'draft') return 'draft';
    return 'pending';
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getAssignmentStatus(assignment);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-2 top-2 text-gray-400" size={20} />
          <input
            type="text"
            className="pl-8 p-2 border rounded-lg"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="p-2 border rounded-lg"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="submitted">Submitted</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {filteredAssignments.length === 0 ? (
        <p className="text-gray-500">No assignments found.</p>
      ) : (
        filteredAssignments.map((assignment) => (
          <div key={assignment.id} className="p-4 bg-white shadow rounded-lg">
            <h2 className="text-lg font-bold">{assignment.title}</h2>
            <p>{assignment.description}</p>
            <p className="text-sm text-gray-500">
              Due{' '}
              {formatDistanceToNow(new Date(assignment.due_date), {
                addSuffix: true,
              })}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              {getAssignmentStatus(assignment) === 'submitted' && (
                <CheckCircle className="text-green-500" />
              )}
              {getAssignmentStatus(assignment) === 'overdue' && (
                <AlertCircle className="text-red-500" />
              )}
              {getAssignmentStatus(assignment) === 'pending' && (
                <Clock className="text-yellow-500" />
              )}
              <span className="text-gray-600">
                {getAssignmentStatus(assignment)}
              </span>
            </div>
            <Link
              to={`/assignments/${assignment.id}`}
              className="mt-2 inline-block text-blue-500 hover:underline"
            >
              View Details
            </Link>
          </div>
        ))
      )}
    </div>
  );
};

export default Assignments;
