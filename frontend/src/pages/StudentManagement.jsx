import React, { useState, useEffect } from 'react';
import StudentForm from '../components/StudentForm';
import StudentList from '../components/StudentList';
import { studentService } from '../services/studentService';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentService.getAllStudents();
      setStudents(data);
    } catch (err) {
      setError('Failed to fetch students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (studentData) => {
    setError('');
    try {
      await studentService.addStudent(studentData);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add student');
      throw err;
    }
  };

  const handleUpdateStudent = async (studentData) => {
    setError('');
    try {
      await studentService.updateStudent(editingStudent.id, studentData);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update student');
      throw err;
    }
  };

  const handleDeleteStudent = async (id) => {
    setError('');
    try {
      await studentService.deleteStudent(id);
      await fetchStudents();
    } catch (err) {
      setError('Failed to delete student');
    }
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setError('');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Student Management System</h1>
      </div>
      
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="grid-container">
        <div>
          <StudentForm
            onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent}
            editingStudent={editingStudent}
            onCancel={handleCancelEdit}
          />
        </div>
        
        <div>
          <StudentList
            students={students}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteStudent}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
