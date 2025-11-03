import React from 'react';

const StudentList = ({ students, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="table-container">
        <h2>Students List</h2>
        <div className="loading">
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <h2>Students List</h2>
      
      {students.length === 0 ? (
        <p className="empty-state">No students found. Add some students to get started.</p>
      ) : (
        <table className="student-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Course</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.course}</td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() => onEdit(student)}
                      className="btn btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this student?')) {
                          onDelete(student.id);
                        }
                      }}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentList;