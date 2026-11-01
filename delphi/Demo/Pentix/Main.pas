unit Main;

interface

uses
  Windows, Messages, SysUtils, Classes, Graphics, Controls, Forms, Dialogs,
  Tetris, ExtCtrls, StdCtrls, HiScore, Menus, Registry;

const
  MaxLevel = 9;
  HiScoreFileName = 'Pentix.hsc';
  HiNCol = 0;
  HiNameCol = 1;
  HiPointsCol = 2;  //Column number for Points
  HiDateCol = 3;
  HiLevelCol = 4;
  ComputerName = 'Computer';
//Registry
  sRegAppKey = 'Software\L15';
  sSectProg = 'Pentix';
    sPlayerName    = 'PlayerName';
    sShowPlayerDlg = 'ShowPlayerDlg';
    sTruncSquare   = 'TruncSquares';
    sDemoOnWait    = 'DemoOnWait';
    sWinSizeX      = 'WinSizeX';
    sWinSizeY      = 'WinSizeY';
    sDemoScoring   = 'DemoScoring';
    sKeyLeft       = 'KeyLeft';
    sKeyRight      = 'KeyRight';
    sKeyRotate     = 'KeyRotate';
    sKeyDropDown   = 'KeyDropDown';
    sKeyShowNext   = 'KeyShowNext';
    sKeyIncLevel   = 'KeyIncLevel';
    sKeyPause      = 'KeyPause';

type
  TfmMain = class(TForm)
    pa1: TPanel;
    pa2: TPanel;
    Tetris: TlfTetris;
    TetrisServer: TlfTetrisServer;
    HiScore: TlfHiScore;
    laLevel: TLabel;
    laLines: TLabel;
    laBlocks: TLabel;
    laScore: TLabel;
    laChampion: TLabel;
    laRecord: TLabel;
    pbNext: TPaintBox;
    mm: TMainMenu;
    miGame: TMenuItem;
    miNew: TMenuItem;
    miGameLine2: TMenuItem;
    miExit: TMenuItem;
    laNext: TLabel;
    paBottom: TPanel;
    miPreferences: TMenuItem;
    miClearHighScore: TMenuItem;
    miAbout: TMenuItem;
    miGameLine1: TMenuItem;
    miPlayerName: TMenuItem;
    Options1: TMenuItem;
    miMergeHiScores: TMenuItem;
    OpenDialog: TOpenDialog;
    ClearComputerScores: TMenuItem;
    procedure FormCreate(Sender: TObject);
    procedure miNewClick(Sender: TObject);
    procedure TetrisDropDown(Tetris: TlfTetris);
    procedure TetrisDeleteLine(Tetris: TlfTetris; Row: Integer;
      var NeedDelete: Boolean);
    procedure TetrisBuryBlock(Tetris: TlfTetris; var NeedBury: Boolean);
    procedure pbNextPaint(Sender: TObject);
    procedure TetrisChangeBlock(Tetris: TlfTetris; var NewBlock: TBlock);
    procedure miExitClick(Sender: TObject);
    procedure TetrisGetNextBlock(Tetris: TlfTetris);
    procedure miClearHighScoreClick(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure TetrisGameOver(Tetris: TlfTetris);
    procedure miPlayerNameClick(Sender: TObject);
    procedure miAboutClick(Sender: TObject);
    procedure miPreferencesClick(Sender: TObject);
    procedure FormKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure FormKeyPress(Sender: TObject; var Key: Char);
    procedure TetrisStartGame(Tetris: TlfTetris; var Demo: Boolean);
    procedure miMergeHiScoresClick(Sender: TObject);
    procedure ClearComputerScoresClick(Sender: TObject);
  private
    FBlocks: Integer;
    FCurPlayer: TStrings;  //TStrings for current player
    FLevel: Integer;
    FLines: Integer;
    FPlayerName: string;
    FScore: Integer;       //field for hold points
    FShowNext: Boolean;
    FTmpLines: Integer;
    Ini       : TRegIniFile;
    procedure ClearCurPlayer;
    procedure LoadConsts;
    procedure SaveConsts;
    procedure SetBlocks(Value: Integer);
    procedure SetChampion;
    procedure SetLevel(Value: Integer);
    procedure SetLines(Value: Integer);
    procedure SetPlayerName(Value: string);
    procedure SetScore(Value: Integer);
    procedure SetShowNext(Value: Boolean);
    procedure LoadHiScore;
    procedure SaveHiScore;
    procedure StartNewGame(ALevel: Integer);
    procedure ClearHighScoreRow(ARow: Integer);
  public
    ShowPlayerDlg : Boolean;
    DemoScoring : Boolean;
    WinSizeX    : Integer;
    WinSizeY    : Integer;
    KeyLeft     : TShortCut;
    KeyRight    : TShortCut;
    KeyRotate   : TShortCut;
    KeyDropDown : TShortCut;
    KeyShowNext : TShortCut;
    KeyIncLevel : TShortCut;
    KeyPause    : TShortCut;
    property Blocks: Integer read FBlocks write SetBlocks;
    property Level: Integer read FLevel write SetLevel;
    property Lines: Integer read FLines write SetLines;
    property PlayerName : string read FPlayerName write SetPlayerName;
    property Score: Integer read FScore write SetScore;
    property ShowNext: Boolean read FShowNext write SetShowNext;
    procedure IncScore(Value: Integer);
  end;

var
  fmMain: TfmMain;

implementation

uses About, Options;

{$R *.DFM}

procedure TfmMain.FormCreate(Sender: TObject);
const
  Perc : array [0..4] of integer = (8, 38, 16, 21, 14);
var
  SqX, SqY : Integer;
  c        : Longint;
begin
//Init private vars
  FBlocks := 0;
  FLines  := 0;
  FScore  := 0;
  FLevel  := 0;
  FPlayerName := 'Player1';
  FCurPlayer := TStringList.Create;
  ClearCurPlayer;
  FShowNext := False;
//from registry
  ShowPlayerDlg := True;
  DemoScoring := False;
  WinSizeX := 640;
  WinSizeY := 480;
  KeyLeft := ShortCut(VK_NUMPAD7, []);
  KeyRight := ShortCut(VK_NUMPAD9, []);
  KeyRotate := ShortCut(VK_NUMPAD8, []);
  KeyDropDown := ShortCut(VK_SPACE, []);
  KeyShowNext := ShortCut(VK_NUMPAD0, []);
  KeyIncLevel := ShortCut(VK_ADD, []);
  KeyPause    := ShortCut(VK_NUMPAD3, []);
  Ini  :=  TRegIniFile.Create(sRegAppKey);
  LoadConsts;
  Width := WinSizeX;
  Height := WinSizeY;
//Setting controls locations
  pa1.Width := ClientWidth div 2;
  with Tetris do
  begin
    SqX := (pa1.ClientWidth - 2 * Left) div (Cols+2);
    SqY := (pa1.ClientHeight - 2 * Top) div (Rows+1);
    if SqX <= SqY then SquareSizeX := SqX
    else SquareSizeX := SqY;
    SquareSizeY := SquareSizeX;
    pa1.Width := Tetris.Width + 2 * Tetris.Left;
    pbNext.Width := SquareSizeX * 5;
    pbNext.Height := pbNext.Width;
  end;
  pa2.Width := ClientWidth  - pa1.Width;
  laNext.Left := pbNext.Left + (pbNext.Width - laNext.Width) div 2;
  laLevel.Left := pbNext.Left + pbNext.Width + 30;
  laLines.Left := laLevel.Left;
  laBlocks.Left := laLevel.Left;
  laScore.Left := laLevel.Left;
//HiScore
  with HiScore do
  begin
    Height := pa2.ClientHeight - 3 * laChampion.Height -
      pbNext.Top - pbNext.Height;
    for c := 0 to Columns.Count - 1 do
      Columns[c].Width := Round(Width / 100 * Perc[c]);
    LoadHiScore;
  end;
  SetChampion;
  if ShowPlayerDlg then miPlayerNameClick(nil);
  ClearCurPlayer;
end;

procedure TfmMain.FormDestroy(Sender: TObject);
begin
  SaveHiScore;
  SaveConsts;
  Ini.Free;
  FCurPlayer.Free;
end;

procedure TfmMain.ClearCurPlayer;
begin
  while FCurPlayer.Count < HiScore.Columns.Count do FCurPlayer.Add('');
  FCurPlayer[HiNameCol] := PlayerName;
  FCurPlayer[HiPointsCol] := '0';
  FCurPlayer[HiDateCol] := FormatDateTime('c', Date);
  FCurPlayer[HiLevelCol] := IntToStr(FLevel);
end;

procedure TfmMain.SetBlocks(Value: Integer);
begin
  FBlocks := Value;
  laBlocks.Caption := 'Blocks: ' + IntToStr(FBlocks);
end;

procedure TfmMain.SetLines(Value: Integer);
begin
  FLines := Value;
  laLines.Caption := 'Lines: ' + IntToStr(FLines);
end;

procedure TfmMain.SetLevel(Value: Integer);
begin
  if Value > MaxLevel then Exit;
  FLevel := Value;
  if Level > MaxLevel then Tetris.Speed := 50
  else Tetris.Speed := 1000 - 100 * FLevel;
  laLevel.Caption := 'Level: ' + IntToStr(FLevel);
end;

function  Compare(Item1, Item2: TStrings): Integer;
begin
  if Item1[HiPointsCol] = '' then Item1[HiPointsCol] := '0';
  if Item2[HiPointsCol] = '' then Item2[HiPointsCol] := '0';
  if StrToInt(Item1[HiPointsCol]) > StrToInt(Item2[HiPointsCol]) then
    Result := -1
  else Result := 1;
end;

procedure TfmMain.SetScore(Value: Integer);
var
  PretenderPos : Longint;
begin
  FScore := Value;
  laScore.Caption := 'Score: ' + IntToStr(FScore);  //display current score in label
  FCurPlayer[HiPointsCol] := IntToStr(FScore);
  if Tetris.State = tsPlay then
  begin
    PretenderPos := HiScore.GetPretenderRow(FCurPlayer, Compare);
    if PretenderPos < HiScore.RowCount then
    begin
      HiScore.TopRow := PretenderPos - HiScore.VisibleRowCount div 2;
      HiScore.Row := PretenderPos;
    end;
  end;
end;

procedure TfmMain.IncScore(Value: Integer);
begin
  if FShowNext then Value := Value div 2;
  Score := Score + Value;
end;

procedure TfmMain.TetrisGameOver(Tetris: TlfTetris);
var
  PretenderPos : Longint;
begin
  with HiScore do
  begin
    if Tetris.State = tsDemo then
    begin
      if not DemoScoring then Exit;
      FCurPlayer[HiNameCol] := ComputerName;
    end;
    FCurPlayer[HiLevelCol] := IntToStr(FLevel);
    PretenderPos := GetPretenderRow(FCurPlayer, Compare);
    if PretenderPos < HiScore.RowCount then
    begin
      InsertPretender(FCurPlayer, PretenderPos);
      SaveHiScore;
    end;
    Tetris.StrGameOver[2] := 'Your Score: ' + IntToStr(FScore);
    Tetris.StrGameOver[4] := 'Your Place: ' + IntToStr(PretenderPos+1);
    SetChampion;
  end;
end;

procedure TfmMain.SetShowNext(Value: Boolean);
begin
  if Value = FShowNext then Exit;
  FShowNext := Value;
  pbNext.Repaint;
end;

procedure TfmMain.TetrisStartGame(Tetris: TlfTetris; var Demo: Boolean);
begin
  Blocks := 0;
  Lines  := 0;
  Score  := 0;
  if not Demo then ClearCurPlayer;
  Level := FLevel;
end;

procedure TfmMain.StartNewGame(ALevel: Integer);
begin
  FLevel := ALevel;
  TetrisServer.StartGame;
  Tetris.SetFocus;
end;

procedure TfmMain.miNewClick(Sender: TObject);
begin
  StartNewGame(Level);
end;

procedure TfmMain.TetrisBuryBlock(Tetris: TlfTetris; var NeedBury: Boolean);
begin
  NeedBury := True;
  IncScore(Tetris.Block.Points * (FLevel+1));
  FTmpLines := 0;
end;

procedure TfmMain.TetrisDropDown(Tetris: TlfTetris);
begin
  IncScore(Tetris.Block.Points *
    (Tetris.Rows - Tetris.Block.Row) * (FLevel+1) div 10);
end;

procedure TfmMain.TetrisDeleteLine(Tetris: TlfTetris; Row: Integer;
  var NeedDelete: Boolean);
var
  c, r  : Integer;
  Bonus : Integer;
begin
  NeedDelete := True;
  Inc(FTmpLines);
  Lines := Lines + 1;
  IncScore(FTmpLines * (10 + (Tetris.Rows - Row)) * (FLevel+1));
  if Row = Tetris.Rows - 1 then  //check for empty field
  begin
    Bonus := 1000;
    for r := 0 to Tetris.Rows - 2 do
      for c := 0 to Tetris.Cols - 1 do
        if not Tetris.Square[c, r].Empty then Bonus := 0;
    IncScore(Bonus);
  end;
end;

procedure TfmMain.pbNextPaint(Sender: TObject);
begin
  if FShowNext then Tetris.NextBlock.Draw(pbNext.Canvas,
    2 * Tetris.SquareSizeX, 2 * Tetris.SquareSizeY);
end;

procedure TfmMain.TetrisGetNextBlock(Tetris: TlfTetris);
begin
  pbNext.Repaint;
end;

procedure TfmMain.TetrisChangeBlock(Tetris: TlfTetris; var NewBlock: TBlock);
const
  BlocksForLevel = 30;
begin
  Blocks := FBlocks + 1;
  if (FBlocks <> 0) and (FBlocks mod BlocksForLevel = 0) then
    if Level < MaxLevel then Level := FLevel + 1;
end;

procedure TfmMain.miExitClick(Sender: TObject);
begin
  Close;
end;

procedure TfmMain.SetChampion;
begin
  laChampion.Caption := 'Champion: ' + HiScore.Rows[0][HiNameCol];
  laRecord.Caption := 'Record: ' + HiScore.Rows[0][HiPointsCol];
end;

procedure TfmMain.ClearHighScoreRow(ARow: Integer);
begin
  with HiScore do
  begin
    Rows[ARow][HiNCol] := IntToStr(ARow+1);
    Rows[ARow][HiNameCol] := '';
    Rows[ARow][HiPointsCol] := '0';
    Rows[ARow][HiDateCol] := '01.01.01';
    Rows[ARow][HiLevelCol] := '0';
  end;  
end;

procedure TfmMain.miClearHighScoreClick(Sender: TObject);
var
  r : Integer;
begin
  with HiScore do
    for r := 0 to RowCount - 1 do ClearHighScoreRow(r);
  SetChampion;
end;

procedure TfmMain.ClearComputerScoresClick(Sender: TObject);
var
  r, r1 : Integer;
begin
  with HiScore do
    for r := 0 to RowCount - 1 do
      while Rows[r][HiNameCol] = ComputerName do
      begin
        for r1 := r to RowCount - 2 do
          begin
            Rows[r1][HiNameCol]   := Rows[r1+1][HiNameCol];
            Rows[r1][HiPointsCol] := Rows[r1+1][HiPointsCol];
            Rows[r1][HiDateCol]   := Rows[r1+1][HiDateCol];
            Rows[r1][HiDateCol]   := Rows[r1+1][HiDateCol];
          end;
        ClearHighScoreRow(RowCount-1);
      end;
  SetChampion;
end;

procedure TfmMain.SetPlayerName(Value: string);
begin
  FPlayerName := Value;
  Caption := Application.Title + '  -  ' + FPlayerName;
end;

procedure TfmMain.miPlayerNameClick(Sender: TObject);
begin
  PlayerName := InputBox(Application.Title,
    'Enter Player Name:', PlayerName);
end;

procedure TfmMain.miAboutClick(Sender: TObject);
begin
  CallAbout(Self);
end;

procedure TfmMain.LoadConsts;
var
  b : Boolean;
begin
  with Ini do begin
    PlayerName := ReadString(sSectProg, sPlayerName, FPlayerName);
    ShowPlayerDlg := ReadBool(sSectProg, sShowPlayerDlg, ShowPlayerDlg);
    b := ReadBool(sSectProg, sTruncSquare, toTruncSquare in Tetris.Options);
    if b then Tetris.Options := Tetris.Options + [toTruncSquare]
    else Tetris.Options := Tetris.Options - [toTruncSquare];
    b := ReadBool(sSectProg, sDemoOnWait, toDemoOnWait in Tetris.Options);
    if b then Tetris.Options := Tetris.Options + [toDemoOnWait]
    else Tetris.Options := Tetris.Options - [toDemoOnWait];
    DemoScoring := ReadBool(sSectProg, sDemoScoring, DemoScoring);
    WinSizeX := ReadInteger(sSectProg, sWinSizeX, WinSizeX);
    WinSizeY := ReadInteger(sSectProg, sWinSizeY, WinSizeY);
    KeyLeft := ReadInteger(sSectProg, sKeyLeft, KeyLeft);
    KeyRight := ReadInteger(sSectProg, sKeyRight, KeyRight);
    KeyRotate := ReadInteger(sSectProg, sKeyRotate, KeyRotate);
    KeyDropDown := ReadInteger(sSectProg, sKeyDropDown, KeyDropDown);
    KeyShowNext := ReadInteger(sSectProg, sKeyShowNext, KeyShowNext);
    KeyIncLevel := ReadInteger(sSectProg, sKeyIncLevel, KeyIncLevel);
    KeyPause := ReadInteger(sSectProg, sKeyPause, KeyPause);
  end;
end;

procedure TfmMain.SaveConsts;
begin
  with Ini do begin
    WriteString(sSectProg, sPlayerName, PlayerName);
    WriteBool(sSectProg, sShowPlayerDlg, ShowPlayerDlg);
    WriteBool(sSectProg, sTruncSquare, toTruncSquare in Tetris.Options);
    WriteBool(sSectProg, sDemoOnWait, toDemoOnWait in Tetris.Options);
    WriteBool(sSectProg, sDemoScoring, DemoScoring);
    WriteInteger(sSectProg, sWinSizeX, WinSizeX);
    WriteInteger(sSectProg, sWinSizeY, WinSizeY);
    WriteInteger(sSectProg, sKeyLeft, KeyLeft);
    WriteInteger(sSectProg, sKeyRight, KeyRight);
    WriteInteger(sSectProg, sKeyRotate, KeyRotate);
    WriteInteger(sSectProg, sKeyDropDown, KeyDropDown);
    WriteInteger(sSectProg, sKeyShowNext, KeyShowNext);
    WriteInteger(sSectProg, sKeyIncLevel, KeyIncLevel);
    WriteInteger(sSectProg, sKeyPause, KeyPause);
  end;
end;

procedure TfmMain.miPreferencesClick(Sender: TObject);
begin
  CallOptions(Self);
end;

procedure TfmMain.FormKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
var
  sc : TShortCut;
begin
  sc := ShortCut(Key, Shift);
  if sc = 0 then Exit;
  Tetris.UnPauseGame;
  if Tetris.State = tsGameOver then Tetris.WaitGame
  else if Tetris.State = tsPlay then
  begin
    if sc = KeyLeft then
      Tetris.SetBlockPos(Tetris.Block.Col - 1, Tetris.Block.Row)
    else if sc = KeyRight then
      Tetris.SetBlockPos(Tetris.Block.Col + 1, Tetris.Block.Row)
    else if sc = KeyRotate then Tetris.RotateBlock
    else if sc = KeyDropDown then Tetris.DropDown
    else if sc = KeyShowNext then ShowNext := not ShowNext
    else if sc = KeyIncLevel then Level := Level + 1
    else if sc = KeyPause then Tetris.PauseGame
    else Exit;
    Key := 0;
  end;
end;

procedure TfmMain.FormKeyPress(Sender: TObject; var Key: Char);
begin
  if (Tetris.State <> tsPlay) and (Tetris.State <> tsPause) then
  begin
    case Key of
      '0'..'9' :
        begin
          StartNewGame(Ord(Key) - $30);
          Key := #0;
        end;
    end;
  end;
end;

procedure CodingHiScore(var s: string);
var
  i : Integer;
begin
  for i := 1 to Length(s) do s[i] := Chr(Ord(s[i]) - 1);
end;

procedure DecodingHiScore(var s: string);
var
  i : Integer;
begin
  for i := 1 to Length(s) do s[i] := Chr(Ord(s[i]) + 1);
end;

procedure TfmMain.LoadHiScore;
begin
  if FileExists(HiScoreFileName) then
    HiScore.LoadFromFile(HiScoreFileName, DecodingHiScore)
  else miClearHighScoreClick(nil);
end;

procedure TfmMain.SaveHiScore;
begin
  HiScore.SaveToFile(HiScoreFileName, CodingHiScore);
end;

procedure TfmMain.miMergeHiScoresClick(Sender: TObject);
begin
  if OpenDialog.Execute then
    HiScore.MergeFile(OpenDialog.FileName, True, Compare, DecodingHiScore);
end;

end.

