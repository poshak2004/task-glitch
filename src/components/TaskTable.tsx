import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { DerivedTask, Task, TaskInput } from '@/types';
import TaskForm from './TaskForm';
import TaskDetailsDialog from './TaskDetailsDialog';

interface Props {
  tasks: DerivedTask[];
  onAdd: (payload: TaskInput) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export default function TaskTable({
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [details, setDetails] = useState<Task | null>(null);

  const existingTitles = useMemo(
    () => tasks.map(t => t.title),
    [tasks],
  );

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography fontWeight={700}>Tasks</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            Add Task
          </Button>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="right">ROI</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {tasks.map(t => (
                <TableRow
                  key={t.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setDetails(t)}
                >
                  <TableCell>{t.title}</TableCell>
                  <TableCell align="right">${t.revenue}</TableCell>
                  <TableCell align="right">{t.timeTaken}</TableCell>
                  <TableCell align="right">{t.roi}</TableCell>
                  <TableCell>{t.priority}</TableCell>
                  <TableCell>{t.status}</TableCell>

                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          setEditing(t);
                          setOpenForm(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(t.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box py={4} textAlign="center">
                      No tasks yet
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Add / Edit */}
      <TaskForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        existingTitles={existingTitles}
        initial={editing}
        onSubmit={value => {
          if (value.id) {
            const { id, ...patch } = value;
            onUpdate(id, patch);
          } else {
            onAdd(value);
          }
        }}
      />

      {/* View */}
      <TaskDetailsDialog
        open={!!details}
        task={details}
        onClose={() => setDetails(null)}
        onSave={onUpdate}
      />
    </Card>
  );
}
