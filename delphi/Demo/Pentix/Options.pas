unit Options;

interface

uses Windows, SysUtils, Forms, Controls, StdCtrls,
  Buttons, ExtCtrls, Classes, ComCtrls, Menus, Spin;

type
  TfmOpt = class(TForm)
    pa2: TPanel;
    buOK: TBitBtn;
    pa1: TPanel;
    gbGeneral: TGroupBox;
    cbShowPlayerDlg: TCheckBox;
    gbReports: TGroupBox;
    buCancel: TBitBtn;
    edKeyLeft: TEdit;
    laKeyLeft: TLabel;
    laKeyRight: TLabel;
    edKeyRight: TEdit;
    laKeyRotate: TLabel;
    edKeyRotate: TEdit;
    laKeyDropDown: TLabel;
    edKeyDropDown: TEdit;
    laKeyShowNext: TLabel;
    edKeyShowNext: TEdit;
    laKeyIncLevel: TLabel;
    edKeyIncLevel: TEdit;
    seWinSizeX: TSpinEdit;
    laWinSizeX: TLabel;
    laWinSizeY: TLabel;
    seWinSizeY: TSpinEdit;
    cbDemoOnWait: TCheckBox;
    laKeyPause: TLabel;
    edKeyPause: TEdit;
    cbDemoScoring: TCheckBox;
    cbTruncSquare: TCheckBox;
    procedure FormCreate(Sender: TObject);
    procedure buOKClick(Sender: TObject);
    procedure edKeyPress(Sender: TObject; var Key: Char);
    procedure edKeyLeftKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyRightKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyRotateKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyDropDownKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyShowNextKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyIncLevelKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure edKeyPauseKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
  private
    optKeyLeft : TShortCut;
    optKeyRight : TShortCut;
    optKeyRotate : TShortCut;
    optKeyDropDown : TShortCut;
    optKeyShowNext : TShortCut;
    optKeyIncLevel : TShortCut;
    optKeyPause : TShortCut;
    procedure edKeyKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState; var sc: TShortCut);
  public
  end;

function CallOptions(Sender: TComponent): TModalResult;

implementation

uses Main, Tetris;

{$R *.DFM}

function CallOptions(Sender: TComponent): TModalResult;
var
  fm: TfmOpt;
begin
  fm := TfmOpt.Create(Sender);
  with fm do try
    ShowModal;
    Result := ModalResult;
  finally
    Free;
  end;
end;

procedure TfmOpt.FormCreate(Sender: TObject);
begin
  with fmMain do
  begin
    cbShowPlayerDlg.Checked := ShowPlayerDlg;
    cbTruncSquare.Checked := toTruncSquare in Tetris.Options;
    cbDemoOnWait.Checked := toDemoOnWait in Tetris.Options;
    cbDemoScoring.Checked := DemoScoring;
    seWinSizeX.Value := WinSizeX;
    seWinSizeY.Value := WinSizeY;
    optKeyLeft := KeyLeft;
    optKeyRight := KeyRight;
    optKeyRotate := KeyRotate;
    optKeyDropDown := KeyDropDown;
    optKeyShowNext := KeyShowNext;
    optKeyIncLevel := KeyIncLevel;
    optKeyPause := KeyPause;
    edKeyLeft.Text := ShortCutToText(KeyLeft);
    edKeyRight.Text := ShortCutToText(KeyRight);
    edKeyRotate.Text := ShortCutToText(KeyRotate);
    edKeyDropDown.Text := ShortCutToText(KeyDropDown);
    edKeyShowNext.Text := ShortCutToText(KeyShowNext);
    edKeyIncLevel.Text := ShortCutToText(KeyIncLevel);
    edKeyPause.Text := ShortCutToText(KeyPause);
  end;
end;

procedure TfmOpt.buOKClick(Sender: TObject);
begin
  with fmMain do
  begin
    ShowPlayerDlg := cbShowPlayerDlg.Checked;
    if cbTruncSquare.Checked then
      Tetris.Options := Tetris.Options + [toTruncSquare]
    else Tetris.Options := Tetris.Options - [toTruncSquare];
    if cbDemoOnWait.Checked then
      Tetris.Options := Tetris.Options + [toDemoOnWait]
    else Tetris.Options := Tetris.Options - [toDemoOnWait];
    DemoScoring := cbDemoScoring.Checked;
    WinSizeX := seWinSizeX.Value;
    WinSizeY :=seWinSizeY.Value;
    KeyLeft := optKeyLeft;
    KeyRight := optKeyRight;
    KeyRotate := optKeyRotate;
    KeyDropDown := optKeyDropDown;
    KeyShowNext := optKeyShowNext;
    KeyIncLevel := optKeyIncLevel;
    KeyPause := optKeyPause;
  end;
end;

procedure TfmOpt.edKeyPress(Sender: TObject; var Key: Char);
begin
  Key := #0;
end;

procedure TfmOpt.edKeyKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState; var sc: TShortCut);
begin
  if (Key = VK_SHIFT) or (Key = VK_MENU) or (Key = VK_CONTROL) then
    Key := 0;
  sc := ShortCut(Key, Shift);
  (Sender as TEdit).Text := ShortCutToText(sc);
  Key := 0;
  Shift := [];
end;

procedure TfmOpt.edKeyLeftKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyLeft);
end;

procedure TfmOpt.edKeyRightKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyRight);
end;

procedure TfmOpt.edKeyRotateKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyRotate);
end;

procedure TfmOpt.edKeyDropDownKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyDropDown);
end;

procedure TfmOpt.edKeyShowNextKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyShowNext);
end;

procedure TfmOpt.edKeyIncLevelKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyIncLevel);
end;

procedure TfmOpt.edKeyPauseKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  edKeyKeyDown(Sender, Key, Shift, optKeyPause);
end;

end.

