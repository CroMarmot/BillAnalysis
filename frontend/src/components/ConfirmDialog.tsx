import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content: string;
  onClose: (result: boolean) => void;
}

const ConfirmDialog = ({ open, title, content, onClose }: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={() => onClose(false)}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>取消</Button>
        <Button onClick={() => onClose(true)} color="error" variant="contained">
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
