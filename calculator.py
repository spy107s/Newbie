import tkinter as tk
from tkinter import messagebox

class BeautifulCalculator:
    def __init__(self, root):
        self.root = root
        self.root.title("Antigravity Calc")
        self.root.geometry("320x450")
        self.root.configure(bg="#1e1e2e")  # Sleek dark theme background
        self.root.resizable(False, False)

        # Expression tracker
        self.expression = ""

        # Display screen
        self.display_var = tk.StringVar(value="0")
        self.create_display()

        # Keypad layout
        self.create_buttons()

        # Bind keyboard events
        self.root.bind("<Key>", self.handle_key)

    def create_display(self):
        # Frame for display
        display_frame = tk.Frame(self.root, bg="#1e1e2e", bd=0)
        display_frame.pack(expand=True, fill="both", padx=15, pady=20)

        # Label to show current expression (smaller text)
        self.expr_label = tk.Label(
            display_frame,
            text="",
            anchor="e",
            bg="#1e1e2e",
            fg="#7f849c",
            font=("Outfit", 12),
            padx=10
        )
        self.expr_label.pack(fill="x")

        # Main display label (larger text)
        display_label = tk.Label(
            display_frame,
            textvariable=self.display_var,
            anchor="e",
            bg="#1e1e2e",
            fg="#cdd6f4",
            font=("Space Grotesk", 32, "bold"),
            padx=10
        )
        display_label.pack(fill="x", expand=True)

    def create_buttons(self):
        # Frame for buttons
        buttons_frame = tk.Frame(self.root, bg="#181825")
        buttons_frame.pack(fill="both", expand=True)

        # Button configurations
        button_layout = [
            ["C", "Backspace", "", ""],
            ["7", "8", "9", "-"],
            ["4", "5", "6", "+"],
            ["1", "2", "3", "="],
            ["", "0", "", ""]
        ]

        # Configure grid weight
        for i in range(5):
            buttons_frame.rowconfigure(i, weight=1)
        for j in range(4):
            buttons_frame.columnconfigure(j, weight=1)

        # Styling constants
        font_style = ("Space Grotesk", 16, "bold")
        
        for r, row in enumerate(button_layout):
            for c, char in enumerate(row):
                if not char:
                    continue
                
                # Button colors based on function
                if char in ["+", "-"]:
                    bg_color = "#f38ba8"  # Soft red accent
                    fg_color = "#11111b"
                    active_bg = "#e07a97"
                elif char == "=":
                    bg_color = "#89b4fa"  # Blue accent
                    fg_color = "#11111b"
                    active_bg = "#78a3e9"
                elif char in ["C", "Backspace"]:
                    bg_color = "#313244"
                    fg_color = "#f38ba8"
                    active_bg = "#45475a"
                else:
                    bg_color = "#313244"
                    fg_color = "#cdd6f4"
                    active_bg = "#45475a"

                # Button text correction
                btn_text = char
                if char == "Backspace":
                    btn_text = "⌫"

                # Define column span for double buttons if needed
                col_span = 1
                if char == "=":
                    # Let equal be regular but we could customize
                    pass

                btn = tk.Button(
                    buttons_frame,
                    text=btn_text,
                    font=font_style,
                    bg=bg_color,
                    fg=fg_color,
                    activebackground=active_bg,
                    activeforeground=fg_color,
                    bd=0,
                    relief="flat",
                    command=lambda val=char: self.on_button_click(val)
                )
                btn.grid(row=r, column=c, columnspan=col_span, sticky="nsew", padx=2, pady=2)

    def on_button_click(self, char):
        if char == "C":
            self.expression = ""
            self.display_var.set("0")
            self.expr_label.configure(text="")
        elif char == "Backspace":
            self.expression = self.expression[:-1]
            self.display_var.set(self.expression if self.expression else "0")
        elif char == "=":
            self.evaluate_expression()
        else:
            # Prevent leading zeros or duplicate operators
            if char in ["+", "-"] and (not self.expression or self.expression[-1] in ["+", "-"]):
                return
            self.expression += char
            self.display_var.set(self.expression)

    def evaluate_expression(self):
        if not self.expression:
            return

        # Sanitize input to only allow digits, + and -
        sanitized = "".join(ch for ch in self.expression if ch in "0123456789+-")
        
        try:
            # Safely evaluate simple addition and subtraction
            result = eval(sanitized, {"__builtins__": None}, {})
            self.expr_label.configure(text=f"{self.expression} =")
            self.display_var.set(str(result))
            self.expression = str(result)
        except Exception as e:
            messagebox.showerror("Lỗi", "Biểu thức không hợp lệ")
            self.expression = ""
            self.display_var.set("0")

    def handle_key(self, event):
        key = event.char
        if key in "0123456789+-":
            self.on_button_click(key)
        elif key == "\r" or key == "=":
            self.on_button_click("=")
        elif key == "\x08":  # Backspace
            self.on_button_click("Backspace")
        elif key.lower() == "c":
            self.on_button_click("C")

if __name__ == "__main__":
    root = tk.Tk()
    app = BeautifulCalculator(root)
    root.mainloop()
