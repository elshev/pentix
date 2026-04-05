{*******************************************************}
{                                                       }
{                    L15 Library                        }
{           Copyright (c) 2001-2002 L15                 }
{                                                       }
{*******************************************************}

unit Tetris;

interface

{$I L15.inc}

uses Windows, SysUtils, Classes, Controls, Graphics, Menus, Forms,
  ExtCtrls, Messages, ImgList, Contnrs, ScktComp;

type
  EInvalidBlockId = class(Exception);

  TOfs = record
    x: shortint;
    y: shortint;
  end;
  TOfsArray = array of TOfs;

  TDirection = (diRight, diTop, diLeft, diBottom);

  TBlockRotates = (brNoRotate, br90, brFullRotate);

const
//Block Id
  bi1Line   =  0;
  bi2Line   =  1;
  bi3Line   =  2;
  bi3Corner =  3;
  bi4Line   =  4;
  bi4Square =  5;
  bi4T      =  6;
  bi4L      =  7;
  bi4LMir   =  8;
  bi4S      =  9;
  bi4SMir   = 10;
  bi5Line   = 11;
  bi5Corner = 12;
  bi5Cross  = 13;
  bi5T      = 14;
  bi5W      = 15;
  bi5U      = 16;
  bi5L      = 17;
  bi5LMir   = 18;
  bi5S      = 19;
  bi5SMir   = 20;
  bi5F      = 21;
  bi5FMir   = 22;
  bi5P      = 23;
  bi5PMir   = 24;
  bi5Z      = 25;
  bi5ZMir   = 26;
  bi5R      = 27;
  bi5RMir   = 28;
//Block Offsets
  bo1Line   : array [0..0] of TOfs =
    ((x: 0; y: 0));
  bo2Line   : array [0..1] of TOfs =
    ((x: 0; y: 0), (x: 0; y: 1));
  bo3Line   : array [0..2] of TOfs =
   ((x: 0; y: 0), (x: -1; y: 0), (x: 1; y: 0));
  bo3Corner : array [0..2] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: 1; y: 0));
  bo4Line   : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -2; y: 0), (x: -1; y: 0), (x: 1; y: 0));
  bo4Square : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: 0; y: 1), (x: 1; y: 1), (x: 1; y: 0));
  bo4T      : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -1; y: 0), (x: 1; y: 0), (x: 0; y: -1));
  bo4L      : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -1; y: 0), (x: 1; y: 0), (x: 1; y: -1));
  bo4LMir   : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -1; y: -1), (x: -1; y: 0), (x: 1; y: 0));
  bo4S      : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -1; y: 0), (x: 0; y: -1), (x: 1; y: -1));
  bo4SMir   : array [0..3] of TOfs =
    ((x: 0; y: 0), (x: -1; y: -1), (x: 0; y: -1), (x: 1; y: 0));
  bo5Line   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: -2; y: 0), (x: -1; y: 0), (x: 1; y: 0), (x: 2; y: 0));
  bo5Corner : array [0..4] of TOfs =
    ((x: -1; y: -1), (x: -1; y: 0), (x: -1; y: 1), (x: 0; y: 1), (x: 1; y: 1));
  bo5Cross  : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: 0), (x: 0; y: 1), (x: 1; y: 0));
  bo5T      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 1; y: -1), (x: 0; y: -1), (x: -1; y: -1), (x: 0; y: 1));
  bo5W      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: -1; y: 1), (x: 0; y: 1), (x: 1; y: 0), (x: 1; y: -1));
  bo5U      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: -1; y: -1), (x: -1; y: 0), (x: 1; y: 0), (x: 1; y: -1));
  bo5L      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: -2; y: 0), (x: -1; y: 0), (x: 1; y: 0), (x: 1; y: -1));
  bo5LMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: -1; y: -1), (x: -1; y: 0), (x: 1; y: 0), (x: 2; y: 0));
  bo5S      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -2; y: 0), (x: -1; y: 0), (x: 1; y: -1));
  bo5SMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: -1), (x: 1; y: 0), (x: 2; y: 0));
  bo5F      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: 1), (x: 0; y: 1), (x: 1; y: 0));
  bo5FMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: 0), (x: 0; y: 1), (x: 1; y: 1));
  bo5P      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 1; y: 0), (x: 1; y: -1), (x: 0; y: -1), (x: 0; y: 1));
  bo5PMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: -1), (x: -1; y: 0), (x: 0; y: 1));
  bo5Z      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 0; y: -1), (x: -1; y: -1), (x: 0; y: 1), (x: 1; y: 1));
  bo5ZMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 1; y: -1), (x: 0; y: -1), (x: -1; y: 1), (x: 0; y: 1));
  bo5R      : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 2; y: 0), (x: 1; y: 0), (x: 0; y: -1), (x: -1; y: 0));
  bo5RMir   : array [0..4] of TOfs =
    ((x: 0; y: 0), (x: 1; y: 0), (x: 0; y: -1), (x: -2; y: 0), (x: -1; y: 0));

  anRandom  = -1;     //random angle
  biRandom  = -1;     //random block
//Error codes
  erNoError           = 0;
  erOutOfRight        = 1;
  erOutOfTop          = 2;
  erOutOfLeft         = 3;
  erOutOfBottom       = 4;
  erOverBuried        = 5;
  erNoSquares         = 6;
  erNoGame            = 7;
  erNoEnabledBlocks   = 8;
  erBlockIdNotAllowed = 9;
  erCannotAddLine     = 10;
//Exceptions strings
  sBlockIdNotAllowed = 'Block Id is not allowed';
  sNoEnabledBlocks   = 'No enabled blocks in BlockDescs';

  BlockBufLen = 1024;  //buffer size for block id's in TlfTetrisServer
//message codes for remote connections
  mcServer = $0000;
  mcClient = mcServer + $1000;
  mcStartGame = mcServer + 1;


function  GetMaxOfs(Ofs: TOfsArray; Angle: Integer; Direction: TDirection): Shortint;
function  GetOffsetX(Ofs: TOfsArray; NSquare, Angle: Integer): Shortint;
function  GetOffsetY(Ofs: TOfsArray; NSquare, Angle: Integer): Shortint;
procedure CopyOfs(var Dest: TOfsArray; Src: array of TOfs);
function  FindInOfs(Point: TOfs; Ofs: TOfsArray): Integer;
procedure DeleteFromOfs(var Ofs: TOfsArray; Index: Integer);

type
  TlfTetris = class;
  TlfTetrisServer = class;

  TBlockDesc = class(TCollectionItem)
  private
    FColor : TColor;
    FDescription: string;
    FEnabled : Boolean;
    FImageIndex: TImageIndex;
    FOfs : TOfsArray;
    FPoints: Integer;
    FProbability : word;
    FRotates: TBlockRotates;
    function GetTetrisServer: TlfTetrisServer;
    procedure ReadData(Reader: TReader);
    procedure SetEnabled(Value: Boolean);
    procedure SetOfs(Value: TOfsArray);
    procedure SetProbability(Value: word);
    procedure WriteData(Writer: TWriter);
  protected
    procedure DefineProperties(Filer: TFiler); override;
    function  GetDisplayName: string; override;
  public
    property TetrisServer: TlfTetrisServer read GetTetrisServer;
    property Ofs: TOfsArray read FOfs write SetOfs;
    constructor Create(Collection: TCollection); override;
    destructor Destroy; override;
    procedure Assign(Source: TPersistent); override;
    procedure SetDefaults(BlockId: Integer);
  published
    property Color: TColor read FColor write FColor default clBlue;
    property Description: string read FDescription write FDescription;
    property Enabled: Boolean read FEnabled write SetEnabled default True;
    property ImageIndex: TImageIndex read FImageIndex write FImageIndex default -1;
    property Points: Integer read FPoints write FPoints default 0;
    property Probability: word read FProbability write SetProbability default 1;
    property Rotates: TBlockRotates read FRotates write FRotates default brFullRotate;
  end;

  TBlockDescClass = class of TBlockDesc;

  TBlockDescs = class(TCollection)
  private
    FTetrisServer : TlfTetrisServer;
    function GetBlockDesc(Index: Integer): TBlockDesc;
    procedure SetBlockDesc(Index: Integer; Value: TBlockDesc);
  protected
    function GetOwner: TPersistent; override;
    function Check: Boolean;
  public
    property TetrisServer: TlfTetrisServer read FTetrisServer;
    property Items[Index: Integer]: TBlockDesc read GetBlockDesc write SetBlockDesc; default;
    constructor Create(TetrisServer: TlfTetrisServer; BlockDescClass: TBlockDescClass);
    function  Add: TBlockDesc;
    procedure LoadFromFile(const Filename: string);
    procedure LoadFromStream(S: TStream);
    procedure SaveToFile(const Filename: string);
    procedure SaveToStream(S: TStream);
    procedure SetDefaults;
  end;

  TTetFieldObject = class(TPersistent)
  private
    FImageIndex: TImageIndex;
    FCol: Integer;
    FColor: TColor;
    FEmpty: boolean;
    FRow: Integer;
    FTetris: TlfTetris;
    procedure Draw(Canv: TCanvas; L, T: Integer); virtual; abstract;
    procedure SetImageIndex(Value: TImageIndex); virtual; abstract;
    procedure SetColor(Value: TColor); virtual; abstract;
  protected
    property Col: Integer read FCol;
    property Row: Integer read FRow;
  public
    property ImageIndex: TImageIndex read FImageIndex write SetImageIndex default -1;
    property Color: TColor read FColor write SetColor;
    property Empty: boolean read FEmpty;
    property Tetris: TlfTetris read FTetris;
    constructor Create;
    procedure Assign(Source: TPersistent); override;
  end;

  TTetFieldSquare = class(TTetFieldObject)
  private
    FNeedRepaint : boolean;
    function  GetEmpty: Boolean;
    function  GetImageIndex: TImageIndex;
    procedure SetColor(Value: TColor); override;        //Need Repaint after
    procedure SetEmpty(Value: Boolean);
    procedure SetImageIndex(Value: TImageIndex); override;  //Need Repaint after
  public
    property Col;
    property Empty: boolean read GetEmpty write SetEmpty;
    property ImageIndex: TImageIndex read GetImageIndex write SetImageIndex default -1;
    property NeedRepaint : boolean read FNeedRepaint write FNeedRepaint;
    property Row;
    constructor Create(ACol, ARow: shortint);
    procedure Assign(Source: TPersistent); override;
    procedure DefaultDrawing(ACanvas: TCanvas; ARect: TRect);
    procedure Draw(ACanvas: TCanvas; L, T: Integer); override;
    function IsUnderBlock: Boolean;
  end;

  TBlock = class(TTetFieldObject)
  private
    FAngle: Integer;
    FId: Integer;
    FOfs: TOfsArray;
    FPoints: Integer;
    FRotates: TBlockRotates;
    function  GetCol: Integer;
    function  GetOfsCol(Index: Integer): Integer;
    function  GetOfsRow(Index: Integer): Integer;
    function  GetOfsX(Index: Integer): Shortint;
    function  GetOfsY(Index: Integer): Shortint;
    function  GetRow: Integer;
    procedure SetAngle(Value: Integer);                //only if Self <> FTetris.FBlock
    procedure SetCol(Value: Integer);                  //only if Self <> FTetris.FBlock
    procedure SetColor(Value: TColor); override;       //Need Repaint after
    procedure SetImageIndex(Value: TImageIndex); override; //Need Repaint after
    procedure SetOfs(Value: TOfsArray);                //only if Self <> FTetris.FBlock
    procedure SetRow(Value: Integer);                  //only if Self <> FTetris.FBlock
  protected
  public
    property Angle: Integer read FAngle write SetAngle;
    property Col: Integer read GetCol write SetCol;
    property Ofs: TOfsArray read FOfs write SetOfs;
    property Id: Integer read FId;
    property OfsCol[Index: Integer]: Integer read GetOfsCol;
    property OfsRow[Index: Integer]: Integer read GetOfsRow;
    property OfsX[Index: Integer]: Shortint read GetOfsX;
    property OfsY[Index: Integer]: Shortint read GetOfsY;
    property Points: Integer read FPoints write FPoints;
    property Rotates: TBlockRotates read FRotates write FRotates;
    property Row: Integer read GetRow write SetRow;
    constructor Create;
    procedure Clear;
    procedure DefaultDrawing(ACanvas: TCanvas; NSquare: Integer; ARect: TRect);
    procedure Draw(ACanvas: TCanvas; L, T: Integer); override;
  end;

  TTetDesc = class(TObject)
  private
    FInGame: Boolean;
    FNBlock: Integer;
    FTetris: TlfTetris;
  protected
  public
    property NBlock : Integer read FNBlock;
    property Tetris : TlfTetris read FTetris;
    constructor Create(ATetris: TlfTetris);
  end;

  TTetrisOption = (toRotateClockwise, toRotateNearWall, toMoveAfterDropDown,
    toFastDropDown, toDemoOnWait, toDefaultDrawing, toHorzLines, toVertLines,
    toTruncSquare);
  TTetrisOptions = set of TTetrisOption;
  TTetrisState = (tsWaitGame, tsGameOver, tsPlay, tsDemo, tsPause);
  TCalcDemoDestEvent = procedure (Tetris: TlfTetris; var Col : Integer;
    Row: Integer; var Angle: Integer) of object;
  TChangeAnglePosEvent = procedure (Tetris: TlfTetris;
    var AAngle, ACol, ARow: Integer) of object;
  TChangeBlockEvent = procedure (Tetris: TlfTetris;
    var NewBlock: TBlock) of object;
  TBuryBlockEvent = procedure (Tetris: TlfTetris;
    var NeedBury: Boolean) of object;
  TDeleteLineEvent = procedure (Tetris: TlfTetris; Row : Integer;
    var NeedDelete: Boolean) of object;
  TDrawBlockEvent = procedure (Block: TBlock; Canvas: TCanvas;
    NSquare: Integer; ARect: TRect) of object;
  TDrawFieldEvent = procedure (FieldSquare: TTetFieldSquare;
    Canvas: TCanvas; ARect: TRect) of object;
  TGetNextBlockDescEvent = procedure (Tetris: TlfTetris;
    BlockDesc: TBlockDesc) of object;
  TStartGameEvent = procedure (Tetris: TlfTetris; var Demo: Boolean) of object;
  TTetrisNotifyEvent = procedure (Tetris: TlfTetris) of object;

  TlfTetris = class(TCustomControl)
  private
    FBkgBitmap: TBitmap;
    FBkgColor: TColor;
    FBlock: TBlock;
    FBorderStyle: TBorderStyle;
    FCols: Integer;
    FDemoDestAngle: Integer;
    FDemoDestCol: Integer;
    FField: array of TTetFieldSquare;
    FImageChangeLink: TChangeLink;
    FImages: TCustomImageList;
    FKeyMoveLeft: TShortCut;
    FKeyMoveRight: TShortCut;
    FKeyPause: TShortCut;
    FKeyRotate: TShortCut;
    FKeyStartNewGame: TShortCut;
    FKeyDropDown: TShortCut;
    FLastTickCount: Cardinal;
    FLinesColor: TColor;
    FNextBlock: TBlock;
    FOptions: TTetrisOptions;
    FTetrisServer : TlfTetrisServer;
    FTimerInterval : Cardinal;
    FRows: Integer;
    FSpeed: Cardinal;
    FSpeedDropDown: Cardinal;
    FSquareSizeX: Integer;
    FSquareSizeY: Integer;
    FState: TTetrisState;
    FStrGameOver: TStrings;
    FWellColor: TColor;
    FWellWidth: Word;
    FOnCalcDemoDest: TCalcDemoDestEvent;
    FOnChangeAnglePos: TChangeAnglePosEvent;
    FOnChangeBlock: TChangeBlockEvent;
    FOnDeleteLine: TDeleteLineEvent;
    FOnDrawBlock: TDrawBlockEvent;
    FOnDrawField: TDrawFieldEvent;
    FOnDropDown: TTetrisNotifyEvent;
    FOnBuryBlock: TBuryBlockEvent;
    FOnGameOver: TTetrisNotifyEvent;
    FOnGetNextBlock: TTetrisNotifyEvent;
    FOnGetNextBlockDesc: TGetNextBlockDescEvent;
    FOnStartGame: TStartGameEvent;
    FOnWaitGame: TTetrisNotifyEvent;
    procedure ImageListChange(Sender: TObject);
    function  GetSquare(ACol, ARow: Integer): TTetFieldSquare;
    procedure SetBkgBitmap(Value: TBitmap);
    procedure SetBorderStyle(Value: TBorderStyle);
    procedure SetBkgColor(Value: TColor);
    procedure SetCols(Value: Integer);
    procedure SetImages(Value: TCustomImageList);
    procedure SetLinesColor(Value: TColor);
    procedure SetOptions(Value: TTetrisOptions);
    procedure SetRows(Value: Integer);
    procedure SetSquareSizeX(Value: Integer);
    procedure SetSquareSizeY(Value: Integer);
    procedure SetSpeed(Value: Cardinal);
    procedure SetStrGameOver(Value: TStrings);
    procedure SetTetrisServer(Value: TlfTetrisServer);
    procedure SetTimerInterval(Value: Cardinal);
    procedure SetWellColor(Value: TColor);
    procedure SetWellWidth(Value: Word);
    procedure UpdateField(ACols, ARows, ASquareSizeX, ASquareSizeY: Integer);
    procedure UpdateImages;
    procedure WMEraseBkgnd(var Message: TWMEraseBkgnd); message WM_ERASEBKGND;
    procedure WMGetDlgCode(var Message: TWMGetDlgCode); message WM_GETDLGCODE;
    procedure WMMove(var Message: TWMMove); message WM_MOVE;
    procedure WMSize(var Message: TWMSize); message WM_SIZE;
    procedure CMCtl3DChanged(var Message: TMessage); message CM_CTL3DCHANGED;
  protected
    property  DemoDestAngle: Integer read FDemoDestAngle write FDemoDestAngle;
    property  DemoDestCol: Integer read FDemoDestCol write FDemoDestCol;
    procedure BkgBitmapChanged(Sender: TObject);
    procedure CalcDemoDest; virtual;
    function  ChangeAnglePos(AAngle, ACol, ARow: Integer): word;
    procedure CreateWnd; override;
    procedure CreateParams(var Params: TCreateParams); override;
    procedure DrawLines; virtual;
    procedure DrawWell; virtual;
    function  GetNextBlock: word; virtual;
    procedure KeyDown(var Key: Word; Shift: TShiftState); override;
    procedure KeyUp(var Key: Word; Shift: TShiftState); override;
    procedure MouseDown(Button: TMouseButton; Shift: TShiftState; X, Y: Integer); override;
    procedure Notification(AComponent: TComponent; Operation: TOperation); override;
    procedure Paint; override;
    procedure SetNeedRepaint(IsNeed: boolean); //Set Square.NeedRepaint under block to IsNeed
    procedure StartGame(Demo: boolean = False); virtual;
    procedure TimerExpired; virtual;
    procedure WriteTextOnField(Strings: TStrings); virtual;
  public
    property Block: TBlock read FBlock;
    property Canvas;
    property NextBlock: TBlock read FNextBlock;
    property Square[ACol, ARow: Integer]: TTetFieldSquare read GetSquare;
    property State: TTetrisState read FState;
    constructor Create(AOwner: TComponent); override;
    destructor Destroy; override;
    function  AddLine(NLine: Integer): word;  //Need Repaint after
    procedure BuryBlock;
    function  ChangeBlock(NewBlock: TBlock): word;
    function  CheckAngle(var AAngle: Integer; Rotates: TBlockRotates): word;
    function  CheckBlockOfsAnglePos(Ofs: TOfsArray; AAngle, ACol, ARow: Integer): word;
    function  CheckLine(ARow: Integer): Boolean;
    procedure ClearField;
    procedure DeleteFullLines;            //Need Repaint after
    procedure DeleteLine(ARow: Integer);  //Need Repaint after
    procedure DeleteSquare(ACol, ARow: Integer); //Need Repaint after
    procedure DoInvalidate;
    procedure DropDown;
    procedure EndDropDown;
    procedure EndWayBlock;
    procedure FastDropDown;
    procedure PauseGame;
    procedure GameOver;
    procedure NewBlock;
    function  RotateBlock: word;
    function  SetBlockPos(ACol, ARow: Integer): word;
    procedure StartDemo;
    procedure UnPauseGame;
    procedure WaitGame;
  published
    property Anchors;
    property BkgBitmap: TBitmap read FBkgBitmap write SetBkgBitmap;
    property BorderStyle: TBorderStyle read FBorderStyle write SetBorderStyle default bsSingle;
    property Constraints;
    property BkgColor: TColor read FBkgColor write SetBkgColor default clBlack;
    property Cols: Integer read FCols write SetCols default 12;
    property Ctl3D;
    property DragCursor;
    property DragMode;
    property Enabled;
    property Font;
    property Images: TCustomImageList read FImages write SetImages;
    property KeyMoveLeft: TShortCut read FKeyMoveLeft write FKeyMoveLeft default VK_NUMPAD7;
    property KeyMoveRight: TShortCut read FKeyMoveRight write FKeyMoveRight default VK_NUMPAD9;
    property KeyPause: TShortCut read FKeyPause write FKeyPause default VK_NUMPAD3;
    property KeyRotate: TShortCut read FKeyRotate write FKeyRotate default VK_NUMPAD8;
    property KeyStartNewGame: TShortCut read FKeyStartNewGame write FKeyStartNewGame default VK_F2;
    property KeyDropDown: TShortCut read FKeyDropDown write FKeyDropDown default VK_SPACE;
    property LinesColor: TColor read FLinesColor write SetLinesColor default clBlack;
    property Options: TTetrisOptions read FOptions write SetOptions
      default [toRotateNearWall, toMoveAfterDropDown, toFastDropDown,
      toDemoOnWait, toDefaultDrawing];
    property ParentCtl3D;
    property ParentFont;
    property ParentShowHint;
    property PopupMenu;
    property Rows: Integer read FRows write SetRows default 22;
    property ShowHint;
    property Speed: Cardinal read FSpeed write SetSpeed default 500;
    property SpeedDropDown: Cardinal read FSpeedDropDown write FSpeedDropDown default 25;
    property SquareSizeX: Integer read FSquareSizeX write SetSquareSizeX default 16;
    property SquareSizeY: Integer read FSquareSizeY write SetSquareSizeY default 16;
    property StrGameOver: TStrings read FStrGameOver write SetStrGameOver;
    property TabOrder;
    property TabStop default True;
    property TetrisServer : TlfTetrisServer read FTetrisServer write SetTetrisServer;
    property Visible;
    property WellColor: TColor read FWellColor write SetWellColor default clGray;
    property WellWidth: Word read FWellWidth write SetWellWidth default 16;

    property OnBuryBlock: TBuryBlockEvent read FOnBuryBlock write FOnBuryBlock;
    property OnCalcDemoDest: TCalcDemoDestEvent read FOnCalcDemoDest write FOnCalcDemoDest;
    property OnChangeAnglePos: TChangeAnglePosEvent read FOnChangeAnglePos write FOnChangeAnglePos;
    property OnChangeBlock: TChangeBlockEvent read FOnChangeBlock write FOnChangeBlock;
    property OnClick;
    property OnContextPopup;
    property OnDblClick;
    property OnDeleteLine: TDeleteLineEvent read FOnDeleteLine write FOnDeleteLine;
    property OnDragDrop;
    property OnDragOver;
    property OnDrawBlock: TDrawBlockEvent read FOnDrawBlock write FOnDrawBlock;
    property OnDrawField: TDrawFieldEvent read FOnDrawField write FOnDrawField;
    property OnDropDown: TTetrisNotifyEvent read FOnDropDown write FOnDropDown;
    property OnEndDock;
    property OnEndDrag;
    property OnEnter;
    property OnExit;
    property OnGameOver: TTetrisNotifyEvent read FOnGameOver write FOnGameOver;
    property OnGetNextBlock: TTetrisNotifyEvent read FOnGetNextBlock write FOnGetNextBlock;
    property OnGetNextBlockDesc: TGetNextBlockDescEvent read FOnGetNextBlockDesc write FOnGetNextBlockDesc;
    property OnKeyDown;
    property OnKeyPress;
    property OnKeyUp;
    property OnMouseDown;
    property OnMouseMove;
    property OnMouseUp;
    property OnMouseWheelDown;
    property OnMouseWheelUp;
    property OnStartDock;
    property OnStartDrag;
    property OnStartGame: TStartGameEvent read FOnStartGame write FOnStartGame;
    property OnWaitGame: TTetrisNotifyEvent read FOnWaitGame write FOnWaitGame;
  end;

  TTetrisServerKind = (tskLocal, tskRemote, tskClient);
  TTetrisServerOption = (tsoSameBlocksForAll);
  TTetrisServerOptions = set of TTetrisServerOption;
  TAddDelTetrisEvent = procedure (TetrisServer: TlfTetrisServer;
    Tetris: TlfTetris) of object;

  TlfTetrisServer = class(TComponent)
  private
    FBlockBuf: array [0..BlockBufLen - 1] of Integer;
    FBlockDescs: TBlockDescs;
    FCSSocket: TCustomSocket;
    FKind: TTetrisServerKind;
    FNLead: Integer;
    FOptions: TTetrisServerOptions;
    FTetrises: TObjectList;
    FTimer: TTimer;
    FOnAddTetris: TAddDelTetrisEvent;
    FOnClientConnecting: TSocketNotifyEvent;
    FOnClientLookup: TSocketNotifyEvent;
    FOnCSConnect: TSocketNotifyEvent;
    FOnCSDisconnect: TSocketNotifyEvent;
    FOnCSError: TSocketErrorEvent;
    FOnCSRead: TSocketNotifyEvent;
    FOnCSWrite: TSocketNotifyEvent;
    FOnDeleteTetris: TAddDelTetrisEvent;
    FOnServerAccept: TSocketNotifyEvent;
    FOnServerListen: TSocketNotifyEvent;
    procedure SetBlockDescs(Value: TBlockDescs);
    procedure SetKind(Value: TTetrisServerKind);
    //CS
    function  GetActive: Boolean;
    procedure SetActive(Value: Boolean);
    function  GetPort: Integer;
    procedure SetPort(Value: Integer);
    function  GetService: string;
    procedure SetService(Value: string);
    //Server
    function  GetServerType: TServerType;
    procedure SetServerType(Value: TServerType);
    function  GetThreadCacheSize: Integer;
    procedure SetThreadCacheSize(Value: Integer);
    //Client
    function  GetAddress: string;
    procedure SetAddress(Value: string);
    function  GetHost: string;
    procedure SetHost(Value: string);
    function  GetClientType: TClientType;
    procedure SetClientType(Value: TClientType);

    function ServerSocket: TServerSocket;
    function ClientSocket: TClientSocket;
  protected
    function  CreateBlockDescs: TBlockDescs; dynamic;
    function  GetNByTetris(ATetris: TlfTetris): Integer;
    procedure TimerFired(Sender: TObject);
    procedure ClientConnecting(Sender: TObject; Socket: TCustomWinSocket);
    procedure ClientLookup(Sender: TObject; Socket: TCustomWinSocket);
    procedure CSConnect(Sender: TObject; Socket: TCustomWinSocket);
    procedure CSDisconnect(Sender: TObject; Socket: TCustomWinSocket);
    procedure CSError(Sender: TObject; Socket: TCustomWinSocket;
      ErrorEvent: TErrorEvent; var ErrorCode: Integer);
    procedure CSRead(Sender: TObject; Socket: TCustomWinSocket);
    procedure CSWrite(Sender: TObject; Socket: TCustomWinSocket);
    procedure ServerAccept(Sender: TObject; Socket: TCustomWinSocket);
    procedure ServerListen(Sender: TObject; Socket: TCustomWinSocket);
  public
    property Active: Boolean read GetActive write SetActive;
    property CSSocket: TCustomSocket read FCSSocket;
    constructor Create(AOwner: TComponent); override;
    destructor Destroy; override;
    procedure AddTetris(ATetris: TlfTetris);
    function  CheckBlockId(var BlockId: Integer): word;
    procedure DeleteTetris(ATetris: TlfTetris);
    function  GetBlock(ATetris: TlfTetris; var BlockDesc: TBlockDesc;
      BlockId: Integer = biRandom): word;
    procedure StartGame; virtual;
  published
    property Kind: TTetrisServerKind read FKind write SetKind default tskLocal;
    property Address: string read GetAddress write SetAddress;
    property BlockDescs: TBlockDescs read FBlockDescs write SetBlockDescs;
    property ClientType: TClientType read GetClientType write SetClientType default ctNonBlocking;
    property Host: string read GetHost write SetHost;
    property Options: TTetrisServerOptions read FOptions write FOptions
      default [tsoSameBlocksForAll];
    property Port: Integer read GetPort write SetPort default 0;
    property ServerType: TServerType read GetServerType write SetServerType default stNonBlocking;
    property Service: string read GetService write SetService;
    property ThreadCacheSize: Integer read GetThreadCacheSize write SetThreadCacheSize default 10;
    //events
    property OnAddTetris: TAddDelTetrisEvent read FOnAddTetris write FOnAddTetris;
    property OnClientConnecting: TSocketNotifyEvent read FOnClientConnecting write FOnClientConnecting;
    property OnClientLookup: TSocketNotifyEvent read FOnClientLookup write FOnClientLookup;
    property OnCSConnect: TSocketNotifyEvent read FOnCSConnect write FOnCSConnect;
    property OnCSDisconnect: TSocketNotifyEvent read FOnCSDisconnect write FOnCSDisconnect;
    property OnCSError: TSocketErrorEvent read FOnCSError write FOnCSError;
    property OnCSRead: TSocketNotifyEvent read FOnCSRead write FOnCSRead;
    property OnCSWrite: TSocketNotifyEvent read FOnCSWrite write FOnCSWrite;
    property OnDeleteTetris: TAddDelTetrisEvent read FOnDeleteTetris write FOnDeleteTetris;
    property OnServerAccept: TSocketNotifyEvent read FOnServerAccept write FOnServerAccept;
    property OnServerListen: TSocketNotifyEvent read FOnServerListen write FOnServerListen;
  end;

implementation

uses Math;

{ Help functions }
function GetMaxOfs(Ofs: TOfsArray; Angle: Integer; Direction: TDirection): Shortint;
var
  i: integer;
begin
  Result := 0;
  for i := 0 to High(Ofs) do
  case Direction of
    diTop    : Result := Min(Result, GetOffsetY(Ofs, i, Angle));
    diLeft   : Result := Min(Result, GetOffsetX(Ofs, i, Angle));
    diBottom : Result := Max(Result, GetOffsetY(Ofs, i, Angle));
    else
      Result := Max(Result, GetOffsetX(Ofs, i, Angle));
  end;
  Result := Abs(Result);
end;

function GetOffsetX(Ofs: TOfsArray; NSquare, Angle: Integer): Shortint;
begin
  Result := Ofs[NSquare].x;
  case Angle of
    90  : Result := Ofs[NSquare].y;
    180 : Result := - Ofs[NSquare].x;
    270 : Result := - Ofs[NSquare].y;
  end;
end;

function GetOffsetY(Ofs: TOfsArray; NSquare, Angle: Integer): Shortint;
begin
  Result := Ofs[NSquare].y;
  case Angle of
    90  : Result := - Ofs[NSquare].x;
    180 : Result := - Ofs[NSquare].y;
    270 : Result := Ofs[NSquare].x;
  end;
end;

procedure CopyOfs(var Dest: TOfsArray; Src: array of TOfs);
var
  i: Integer;
begin
  SetLength(Dest, Length(Src));
  for i := 0 to High(Src) do
  begin
    Dest[i].x := Src[i].x;
    Dest[i].y := Src[i].y;
  end;
end;

function FindInOfs(Point: TOfs; Ofs: TOfsArray): Integer;
var
  i: Integer;
begin
  Result := -1;
  for i := 0 to High(Ofs) do
    if (Point.x = Ofs[i].x) and  (Point.y = Ofs[i].y) then
    begin
      Result := i;
      Exit;
    end;
end;

procedure DeleteFromOfs(var Ofs: TOfsArray; Index: Integer);
var
  i: Integer;
begin
  for i := Index to High(Ofs) - 1 do
    Ofs[i] := Ofs[i + 1];
  SetLength(Ofs, Length(Ofs) - 1);
end;

{ TBlockDesc }

constructor TBlockDesc.Create(Collection: TCollection);
begin
  inherited Create(Collection);
  FEnabled := True;
  FColor := clBlue;
  FImageIndex := -1;
  FPoints := 0;
  FProbability := 1;
  Rotates := brFullRotate;
  SetLength(FOfs, 0);
  FDescription := '';
end;

destructor TBlockDesc.Destroy;
begin
  SetLength(FOfs, 0);
  inherited Destroy;
end;

procedure TBlockDesc.Assign(Source: TPersistent);
begin
  if Source is TBlockDesc then
  begin
    if Assigned(Collection) then Collection.BeginUpdate;
    try
      Enabled := TBlockDesc(Source).Enabled;
      Description := TBlockDesc(Source).Description;
      Color := TBlockDesc(Source).Color;
      ImageIndex := TBlockDesc(Source).ImageIndex;
      Probability := TBlockDesc(Source).Probability;
      Points := TBlockDesc(Source).Points;
      Rotates := TBlockDesc(Source).Rotates;
      CopyOfs(FOfs, TBlockDesc(Source).FOfs);
    finally
      if Assigned(Collection) then Collection.EndUpdate;
    end;
  end
  else
    inherited Assign(Source);
end;

procedure TBlockDesc.DefineProperties(Filer: TFiler);

  function DoWrite: Boolean;
  begin
    if Filer.Ancestor <> nil then
    begin
      Result := True;
      if Filer.Ancestor is TBlockDesc then
        Result := not (TBlockDesc(Filer.Ancestor).FOfs = FOfs)
    end
    else Result := Length(FOfs) > 0;
  end;

begin
  inherited;
  Filer.DefineProperty('Ofs', ReadData, WriteData, DoWrite);
end;

function TBlockDesc.GetDisplayName: string;
begin
  Result := FDescription;
  if Result = '' then Result := inherited GetDisplayName;
end;
  
function TBlockDesc.GetTetrisServer: TlfTetrisServer;
begin
  if Assigned(Collection) and (Collection is TBlockDescs) then
    Result := TBlockDescs(Collection).TetrisServer
  else
    Result := nil;
end;

procedure TBlockDesc.ReadData(Reader: TReader);
begin
  Reader.ReadListBegin;
  SetLength(FOfs, 0);
  while not Reader.EndOfList do
  begin
    SetLength(FOfs, Length(FOfs) + 1);
    FOfs[High(FOfs)].x := Reader.ReadInteger;
    FOfs[High(FOfs)].y := Reader.ReadInteger;
  end;
  Reader.ReadListEnd;
end;

procedure TBlockDesc.SetDefaults(BlockId: Integer);
begin
  if not BlockId in [0..28] then
    raise EInvalidBlockId.Create(sBlockIdNotAllowed);
  FEnabled := True;
  FProbability := 1;
  Rotates := brFullRotate;
  case BlockId of
    bi1Line :
      begin
        CopyOfs(FOfs, bo1Line);
        FRotates := brNoRotate;
        FDescription := '1Line';
        FColor := clBlue;
      end;
    bi2Line :
      begin
        CopyOfs(FOfs, bo2Line);
        FRotates := br90;
        FDescription := '2Line';
        FColor := clRed;
      end;
    bi3Line :
      begin
        CopyOfs(FOfs, bo3Line);
        FRotates := br90;
        FDescription := '3Line';
        FColor := clRed;
      end;
    bi3Corner :
      begin
        CopyOfs(FOfs, bo3Corner);
        FDescription := '3Corner';
        FColor := clSilver;
      end;
    bi4Line :
      begin
        CopyOfs(FOfs, bo4Line);
        FRotates := br90;
        FDescription := '4Line';
        FColor := clRed;
      end;
    bi4Square :
      begin
        CopyOfs(FOfs, bo4Square);
        FRotates := brNoRotate;
        FDescription := '4Square';
        FColor := clBlue;
      end;
    bi4T :
      begin
        CopyOfs(FOfs, bo4T);
        FDescription := '4T';
        FColor := clYellow;
      end;
    bi4L :
      begin
        CopyOfs(FOfs, bo4L);
        FDescription := '4L';
        FColor := clFuchsia;
      end;
    bi4LMir :
      begin
        CopyOfs(FOfs, bo4LMir);
        FDescription := '4LMir';
        FColor := clSilver;
      end;
    bi4S :
      begin
        CopyOfs(FOfs, bo4S);
        Rotates := br90;
        FDescription := '4S';
        FColor := clLime;
      end;
    bi4SMir :
      begin
        CopyOfs(FOfs, bo4SMir);
        FRotates := br90;
        FDescription := '4SMir';
        FColor := clAqua;
      end;
    bi5Line :
      begin
        CopyOfs(FOfs, bo5Line);
        FRotates := br90;
        FDescription := '5Line';
        FColor := clRed;
      end;
    bi5Corner :
      begin
        CopyOfs(FOfs, bo5Corner);
        FDescription := '5Corner';
        FColor := clSilver;
      end;
    bi5Cross :
      begin
        CopyOfs(FOfs, bo5Cross);
        FRotates := brNoRotate;
        FDescription := '5Cross';
        FColor := clSilver;
      end;
    bi5T :
      begin
        CopyOfs(FOfs, bo5T);
        FDescription := '5T';
        FColor := clYellow;
      end;
    bi5W :
      begin
        CopyOfs(FOfs, bo5W);
        FDescription := '5W';
        FColor := clYellow;
      end;
    bi5U :
      begin
        CopyOfs(FOfs, bo5U);
        FDescription := '5U';
        FColor := clFuchsia;
      end;
    bi5L :
      begin
        CopyOfs(FOfs, bo5L);
        FDescription := '5L';
        FColor := clFuchsia;
      end;
    bi5LMir :
      begin
        CopyOfs(FOfs, bo5LMir);
        FDescription := '5LMir';
        FColor := clYellow;
      end;
    bi5S :
      begin
        CopyOfs(FOfs, bo5S);
        FDescription := '5S';
        FColor := clAqua;
      end;
    bi5SMir :
      begin
        CopyOfs(FOfs, bo5SMir);
        FDescription := '5SMir';
        FColor := clLime;
      end;
    bi5F :
      begin
        CopyOfs(FOfs, bo5F);
        FDescription := '5F';
        FColor := clLime;
      end;
    bi5FMir :
      begin
        CopyOfs(FOfs, bo5FMir);
        FDescription := '5FMir';
        FColor := clAqua;
      end;
    bi5P :
      begin
        CopyOfs(FOfs, bo5P);
        FDescription := '5P';
        FColor := clBlue;
      end;
    bi5PMir :
      begin
        CopyOfs(FOfs, bo5PMir);
        FDescription := '5PMir';
        FColor := clBlue;
      end;
    bi5Z :
      begin
        CopyOfs(FOfs, bo5Z);
        FRotates := br90;
        FDescription := '5Z';
        FColor := clLime;
      end;
    bi5ZMir :
      begin
        CopyOfs(FOfs, bo5ZMir);
        FRotates := br90;
        FDescription := '5ZMir';
        FColor := clFuchsia;
      end;
    bi5R :
      begin
        CopyOfs(FOfs, bo5R);
        FDescription := '5R';
        FColor := clSilver;
      end;
    bi5RMir :
      begin
        CopyOfs(FOfs, bo5RMir);
        FDescription := '5RMir';
        FColor := clYellow;
      end;
  end;
end;

procedure TBlockDesc.SetEnabled(Value: Boolean);
begin
  if Length(FOfs) = 0 then FEnabled := False
  else if FEnabled <> Value then FEnabled := Value;
  (Collection as TBlockDescs).Check;
end;

procedure TBlockDesc.SetOfs(Value: TOfsArray);
begin
  CopyOfs(FOfs, Value);
  if Length(FOfs) = 0 then FEnabled := False;
end;

procedure TBlockDesc.SetProbability(Value: word);
begin
  if FProbability = Value then Exit;
  FProbability := Value;
  (Collection as TBlockDescs).Check;
end;

procedure TBlockDesc.WriteData(Writer: TWriter);
var
  I: Integer;
begin
  Writer.WriteListBegin;
  for I := 0 to High(FOfs) do
  begin
    Writer.WriteInteger(FOfs[I].x);
    Writer.WriteInteger(FOfs[I].y);
  end;
  Writer.WriteListEnd;
end;

{ TBlockDescs }

constructor TBlockDescs.Create(TetrisServer: TlfTetrisServer; BlockDescClass: TBlockDescClass);
begin
  inherited Create(BlockDescClass);
  FTetrisServer := TetrisServer;
end;

function TBlockDescs.Add: TBlockDesc;
begin
  Result := TBlockDesc(inherited Add);
end;

function TBlockDescs.GetBlockDesc(Index: Integer): TBlockDesc;
begin
  Result := TBlockDesc(inherited Items[Index]);
end;

function TBlockDescs.Check: Boolean;
var
  i : Integer;
  SumProb : word;
begin
  Result := False;
  if Count = 0 then Exit;
  SumProb := 0;
  for i := 0 to Count - 1 do
    if Items[i].FEnabled and (Length(Items[i].FOfs) > 0) then
    begin
      SumProb := SumProb + Items[i].Probability;
      Result := True;
    end;
  if SumProb = 0 then Result := False;
end;

function TBlockDescs.GetOwner: TPersistent;
begin
  Result := FTetrisServer;
end;

procedure TBlockDescs.LoadFromFile(const Filename: string);
var
  S: TFileStream;
begin
  S := TFileStream.Create(Filename, fmOpenRead);
  try
    LoadFromStream(S);
  finally
    S.Free;
  end;
end;

type
  TBlockDescsWrapper = class(TComponent)
  private
    FBlockDescs: TBlockDescs;
  published
    property BlockDescs: TBlockDescs read FBlockDescs write FBlockDescs;
  end;

procedure TBlockDescs.LoadFromStream(S: TStream);
var
  Wrapper: TBlockDescsWrapper;
begin
  Wrapper := TBlockDescsWrapper.Create(nil);
  try
    Wrapper.BlockDescs := FTetrisServer.CreateBlockDescs;
    S.ReadComponent(Wrapper);
    Assign(Wrapper.BlockDescs);
  finally
    Wrapper.BlockDescs.Free;
    Wrapper.Free;
  end;
end;

procedure TBlockDescs.SaveToFile(const Filename: string);
var
  S: TStream;
begin
  S := TFileStream.Create(Filename, fmCreate);
  try
    SaveToStream(S);
  finally
    S.Free;
  end;
end;

procedure TBlockDescs.SaveToStream(S: TStream);
var
  Wrapper: TBlockDescsWrapper;
begin
  Wrapper := TBlockDescsWrapper.Create(nil);
  try
    Wrapper.BlockDescs := Self;
    S.WriteComponent(Wrapper);
  finally
    Wrapper.Free;
  end;
end;

procedure TBlockDescs.SetBlockDesc(Index: Integer; Value: TBlockDesc);
begin
  Items[Index].Assign(Value);
end;

procedure TBlockDescs.SetDefaults;
var
  I : Integer;
begin
  Clear;
  for I := 0 to 28 do
  begin
    Add;
    Items[I].SetDefaults(I);
  end;
end;

{ TTetFieldObject }

constructor TTetFieldObject.Create;
begin
  inherited Create;
  FCol := -1;
  FRow := -1;
  FEmpty := True;
  FColor := clBlack;
  FImageIndex := -1;
end;

procedure TTetFieldObject.Assign(Source: TPersistent);
var
  tfo: TTetFieldObject;
begin
  if Source is TTetFieldObject then
  begin
    tfo := TTetFieldObject(Source);
    Color := tfo.Color;
    ImageIndex := tfo.ImageIndex;
  end
  else inherited Assign(Source);
end;

{ TTetFieldSquare }

constructor TTetFieldSquare.Create(ACol, ARow: Shortint);
begin
  inherited Create;
  FCol := ACol;
  FRow := ARow;
  FNeedRepaint := True;
end;

procedure TTetFieldSquare.Assign(Source: TPersistent);
var
  tfs : TTetFieldSquare;
begin
  if Source is TTetFieldSquare then
  begin
    tfs := TTetFieldSquare(Source);
    Empty := tfs.Empty;
    NeedRepaint := tfs.NeedRepaint;
  end;
  inherited Assign(Source);
end;

procedure TTetFieldSquare.DefaultDrawing(ACanvas: TCanvas; ARect: TRect);
var
  W, H    : Integer;
  SrcRect : TRect;
  DestBmp : TBitmap;
begin
  with FTetris do
  begin
    W := ARect.Right - ARect.Left;
    H := ARect.Bottom - ARect.Top;
    if not BkgBitmap.Empty then
    begin
      SrcRect  := Bounds(FCol * FSquareSizeX, FRow * FSquareSizeY, W, H);
      DestBmp := TBitmap.Create;
      try
        DestBmp.Width  := W;
        DestBmp.Height := H;
        DestBmp.Canvas.CopyRect(Bounds(0, 0, W, H), BkgBitmap.Canvas, SrcRect);
        ACanvas.Draw(ARect.Left, ARect.Top, DestBmp);
      finally
        DestBmp.Free;
      end;
    end else
    begin
      ACanvas.Brush.Color := BkgColor;
      ACanvas.FillRect(ARect);
    end;
    if not FEmpty then
    begin
      W := Min(W, FSquareSizeX -
        byte((toVertLines in FOptions) or (toTruncSquare in FOptions)));
      H := Min(H, FSquareSizeY -
        byte((toHorzLines in FOptions) or (toTruncSquare in FOptions)));
      ARect := Bounds(ARect.Left, ARect.Top, W, H);
      if Assigned(Images) and (FImageIndex > -1) and
        (FImageIndex < Images.Count) then
        Images.Draw(ACanvas, ARect.Left, ARect.Top, FImageIndex)
      else begin
        ACanvas.Brush.Color := Self.Color;
        ACanvas.FillRect(ARect);
      end;
    end;
  end;
end;

procedure TTetFieldSquare.Draw(ACanvas: TCanvas; L, T: Integer);
var
  Rct : TRect;
begin
  with FTetris do
  begin
    Rct := Bounds(L, T,
      FSquareSizeX - byte(toVertLines in FOptions),
      FSquareSizeY - byte(toHorzLines in FOptions));
    if (toDefaultDrawing in FOptions) or (csDesigning in ComponentState) then
      DefaultDrawing(ACanvas, Rct);
    if Assigned(FOnDrawField) then FOnDrawField(Self, ACanvas, Rct);
    FNeedRepaint := False;
  end;
end;

function TTetFieldSquare.IsUnderBlock: Boolean;
var
  i : Integer;
begin
  Result := False;
  with FTetris do
  begin
    if FBlock.FEmpty then Exit;
    for i := 0 to High(FBlock.FOfs) do
      if (FBlock.OfsCol[i] = FCol) and (FBlock.OfsRow[i] = FRow) then
      begin
        Result := True;
        Break;
      end;
  end;
end;

function TTetFieldSquare.GetEmpty: Boolean;
begin
  Result := FEmpty;
end;

function TTetFieldSquare.GetImageIndex: TImageIndex;
begin
  Result := FImageIndex;
end;

procedure TTetFieldSquare.SetEmpty(Value: Boolean);
begin
  if Value <> FEmpty then FEmpty := Value;
end;

procedure TTetFieldSquare.SetImageIndex(Value: TImageIndex);
begin
  if Value = FImageIndex then Exit;
  FImageIndex := Value;
  FNeedRepaint := True;
end;

procedure TTetFieldSquare.SetColor(Value: TColor);
begin
  if Value = FColor then Exit;
  FColor := Value;
  FNeedRepaint := True;
end;

{ TBlock }

constructor TBlock.Create;
begin
  inherited Create;
  Clear;
end;

procedure TBlock.Clear;
begin
  FId := biRandom;
  FColor := clBlue;
  FAngle := anRandom;
  FCol := -1;
  FRow := -1;
  SetLength(FOfs, 0);
  FRotates := brFullRotate;
  FImageIndex := -1;
  FEmpty := True;
  FPoints := 0;
end;

procedure TBlock.DefaultDrawing(ACanvas: TCanvas; NSquare: Integer;
  ARect: TRect);
begin
  with FTetris do
  begin
    if (FImageIndex > -1) and Assigned(Images) and
       (FImageIndex < Images.Count) then
      Images.Draw(ACanvas, ARect.Left, ARect.Top, FImageIndex)
    else begin
      ACanvas.Brush.Color := Self.Color;
      ACanvas.FillRect(ARect);
    end;
  end;
end;

procedure TBlock.Draw(ACanvas: TCanvas; L, T: Integer);
var
  NSq      : Integer;
  Rct      : TRect;
begin
  if FEmpty then Exit;
  with FTetris do
  begin
    for NSq := 0 to High(FOfs) do
    begin
      Rct := Bounds(L + OfsX[NSq] * FSquareSizeX,
        T + OfsY[NSq] * FSquareSizeY,
        FSquareSizeX - byte((toVertLines in FOptions) or (toTruncSquare in FOptions)),
        FSquareSizeY - byte((toHorzLines in FOptions) or (toTruncSquare in FOptions)));
      if (toDefaultDrawing in FOptions) or (csDesigning in ComponentState) then
        DefaultDrawing(ACanvas, NSq, Rct);
      if Assigned(FOnDrawBlock) then FOnDrawBlock(Self, ACanvas, NSq, Rct);
    end;
  end;
end;

function TBlock.GetCol: Integer;
begin
  Result := FCol;
end;

function TBlock.GetRow: Integer;
begin
  Result := FRow;
end;

function TBlock.GetOfsCol(Index: Integer): Integer;
begin
  Result := FCol + OfsX[Index];
end;

function TBlock.GetOfsRow(Index: Integer): Integer;
begin
  Result := FRow + OfsY[Index];
end;

function TBlock.GetOfsX(Index: Integer): Shortint;
begin
  Result := FOfs[Index].x;
  case FAngle of
    90  : Result := FOfs[Index].y;
    180 : Result := - FOfs[Index].x;
    270 : Result := - FOfs[Index].y;
  end;
end;

function TBlock.GetOfsY(Index: Integer): Shortint;
begin
  Result := FOfs[Index].y;
  case FAngle of
    90  : Result := - FOfs[Index].x;
    180 : Result := - FOfs[Index].y;
    270 : Result := FOfs[Index].x;
  end;
end;

procedure TBlock.SetAngle(Value: Integer);
begin
  if FAngle = Value then Exit;
  if (not Assigned(FTetris)) or
     (Assigned(FTetris) and (Self <> FTetris.FBlock)) then
    FAngle := Value;
end;

procedure TBlock.SetCol(Value: Integer);
begin
  if FCol = Value then Exit;
  if (not Assigned(FTetris)) or
     (Assigned(FTetris) and (Self <> FTetris.FBlock)) then
    FCol := Value;
end;

procedure TBlock.SetColor(Value: TColor);
begin
  if Value = FColor then Exit;
  FColor := Value;
end;

procedure TBlock.SetImageIndex(Value: TImageIndex);
begin
  if Value = FImageIndex then Exit;
  FImageIndex := Value;
end;

procedure TBlock.SetOfs(Value: TOfsArray);
begin
  if (FOfs = Value) or (Length(Value) = 0) then Exit;
  if (not Assigned(FTetris)) or
     (Assigned(FTetris) and (Self <> FTetris.FBlock)) then
    FOfs := Value;
end;

procedure TBlock.SetRow(Value: Integer);
begin
  if FRow = Value then Exit;
  if (not Assigned(FTetris)) or
     (Assigned(FTetris) and (Self <> FTetris.FBlock)) then
    FRow := Value;
end;

{ TlfTetris }

constructor TlfTetris.Create(AOwner: TComponent);
begin
  inherited Create(AOwner);
  Randomize;
  ControlStyle := ControlStyle + [csCaptureMouse, csOpaque, csDoubleClicks];
  TabStop := True;
  FBkgColor := clBlack;
  FBorderStyle := bsSingle;
  FOptions := [toRotateNearWall, toMoveAfterDropDown, toFastDropDown,
    toDemoOnWait, toDefaultDrawing];
  FBlock := TBlock.Create;
  FBlock.FTetris := Self;
  FNextBlock := TBlock.Create;
  FNextBlock.FTetris := Self;
  FBkgBitmap := TBitmap.Create;
  FBkgBitmap.OnChange := BkgBitmapChanged;
  FImageChangeLink := TChangeLink.Create;
  FImageChangeLink.OnChange := ImageListChange;
  FState := tsWaitGame;
  UpdateBoundsRect(Rect(0, 0, 0, 0));
  FCols := 0;
  FRows := 0;
  FLinesColor := clBlack;
  FWellColor := clGray;
  FWellWidth := 16;
  UpdateField(12, 22, 16, 16);
  Speed := 900;
  FSpeedDropDown := 25;
  FKeyMoveLeft := VK_NUMPAD7;
  FKeyMoveRight := VK_NUMPAD9;
  FKeyPause := VK_NUMPAD3;
  FKeyRotate := VK_NUMPAD8;
  FKeyStartNewGame := VK_F2;
  FKeyDropDown := VK_SPACE;
  FStrGameOver := TStringList.Create;
  FStrGameOver.Add('Game Over');
  FStrGameOver.Add(' ');
  FStrGameOver.Add('Press F2 to start new game');
  Font.Color := clWhite;
  SetTimerInterval(0);
  WaitGame;
end;

destructor TlfTetris.Destroy;
var
  i : Integer;
begin
  if Assigned(FTetrisServer) then
    FTetrisServer.DeleteTetris(Self);
  FStrGameOver.Free;
  FImageChangeLink.Free;
  if FBkgBitmap <> nil then FBkgBitmap.Free;
  FNextBlock.Free;
  FBlock.Free;
  for i := 0 to High(FField) do FField[i].Free;
  FField := nil;
  inherited Destroy;
end;

procedure TlfTetris.CreateParams(var Params: TCreateParams);
const
  BorderStyles: array [TBorderStyle] of DWORD = (0, WS_BORDER);
begin
  inherited CreateParams(Params);
  with Params do
  begin
    Style := Style or BorderStyles[FBorderStyle];
    if NewStyleControls and Ctl3D and (FBorderStyle = bsSingle) then
    begin
      Style := Style and not WS_BORDER;
      ExStyle := ExStyle or WS_EX_CLIENTEDGE;
    end;
  end;
end;

procedure TlfTetris.CreateWnd;
begin
  inherited CreateWnd;
  SetWindowLong(Handle, GWL_STYLE, GetWindowLong(Handle, GWL_STYLE)
    or WS_CLIPSIBLINGS);
end;

procedure TlfTetris.CMCtl3DChanged(var Message: TMessage);
begin
  if NewStyleControls and (FBorderStyle = bsSingle) then RecreateWnd;
  inherited;
end;

procedure TlfTetris.WMEraseBkgnd(var Message: TWMEraseBkgnd);
var
  i : Integer;
begin
  for i := 0 to High(FField) do FField[i].NeedRepaint := True;
end;

procedure TlfTetris.WMMove(var Message: TWMMove);
var
  i : Integer;
begin
  inherited;
  for i := 0 to High(FField) do FField[i].NeedRepaint := true;
  Repaint;
end;

procedure TlfTetris.WMGetDlgCode(var Message: TWMGetDlgCode);
begin
  Message.Result := DLGC_WANTARROWS + DLGC_WANTCHARS;
end;

procedure TlfTetris.WMSize(var Message: TWMSize);
begin
  DisableAlign;
  try
    inherited;
    UpdateField(FCols, FRows,
      (Width - 2 * FWellWidth) div FCols, (Height - FWellWidth) div FRows);
  finally
    EnableAlign;
  end;
end;

function TlfTetris.AddLine(NLine: Integer): word;
var
  r, c   : Integer;
  MinRow : Integer;
begin
  Result := erCannotAddLine;
  with FBlock do
  begin
    if FEmpty then MinRow := 1
    else MinRow := FRow + GetMaxOfs(FOfs, FAngle, diBottom) + 1;
    if not (NLine in [MinRow..FRows - 1]) then Exit;
    for r := 0 to MinRow do
      for c := 0 to FCols - 1 do
        if not Square[c, r].FEmpty then Exit;
    for c := 0 to FCols - 1 do
    begin
      for r := MinRow - 1 to NLine - 1 do
      begin
        FField[r * FCols + c].Assign(FField[(r + 1) * FCols + c]);
        FField[r * FCols + c].FNeedRepaint := True;
      end;
      Square[c, NLine].FEmpty := True;
      Square[c, NLine].FColor := BkgColor;
      Square[c, NLine].FImageIndex := -1;
      Square[c, NLine].FNeedRepaint := True;
    end;
  end;
  Result := erNoError;
end;

procedure TlfTetris.BkgBitmapChanged(Sender: TObject);
begin
  DoInvalidate;
end;

procedure TlfTetris.BuryBlock;
var
  i : Integer;
  NeedBury : Boolean;
begin
  with FBlock do begin
    if FEmpty then Exit;
    NeedBury := True;
    if Assigned(FOnBuryBlock) then FOnBuryBlock(Self, NeedBury);
    if not FEmpty and NeedBury then
      for i := 0 to High(FOfs) do
      begin
        Square[OfsCol[i], OfsRow[i]].FEmpty := False;
        Square[OfsCol[i], OfsRow[i]].Color := Color;
        Square[OfsCol[i], OfsRow[i]].ImageIndex := ImageIndex;
      end;
    Clear;
  end;
end;

procedure TlfTetris.CalcDemoDest;
const
  HolesCoef = 1.5;
  DelLinesCoef = 3;
var
  i, j     : Integer;
  c, r, an : Integer;
  DestRow  : Integer;
  Priority, pr : Integer;
  CheckUp  : Boolean;
  FldMap   : array of Boolean;
  HolesBefore, HolesAfter : Integer;
  DelLines : Integer;

  function CalcHoles: Integer;
  var
    i, j     : Integer;
    MeetNotEmpty : Boolean;
  begin
    Result := 0;
    for i := 0 to FCols - 1 do
    begin
      MeetNotEmpty := False;
      for j := 0 to FRows - 1 do
      begin
        if FldMap[j * FCols + i] then MeetNotEmpty := True
        else if MeetNotEmpty then Inc(Result);
      end;
    end;
  end;

begin
  if FBlock.FEmpty then Exit;
  FDemoDestAngle := 0;
  FDemoDestCol := 0;
  DestRow := 0;
  Priority := Low(Integer);
  with FBlock do
  for r := FRows - 1 downto 0 do
  begin
    for c := 0 to FCols - 1 do
    begin
      an := 0;
      repeat
        if CheckBlockOfsAnglePos(FOfs, an, c, r) = erNoError then
        begin
          CheckUp := True;
          for i := r - 1 downto GetMaxOfs(FOfs, an, diTop) do    //whether the Block can reach this point
            if CheckBlockOfsAnglePos(FOfs, an, c, i) <> erNoError then
            begin
              CheckUp := False;
              Break;
            end;
          if CheckUp then    //if can
          begin
            //Calc priority of this point
            pr := r;
            SetLength(FldMap, Length(FField));
            for i := 0 to High(FField) do FldMap[i] := not FField[i].FEmpty;
            HolesBefore := CalcHoles;
            for i := 0 to High(FOfs) do      //Put Block on the FldMap and calc holes after this action
              FldMap[(r + GetOffsetY(FOfs, i, an)) * FCols +
                     (c + GetOffsetX(FOfs, i, an))] := True;
            HolesAfter := CalcHoles;
            pr := pr + Round((HolesBefore - HolesAfter) * HolesCoef);
            //Calc Full Lines after putting block on field
            DelLines := 0;
            for j := 0 to FRows - 1 do
            begin
              for i := 0 to FCols - 1 do
                if not FldMap[j * FCols + i] then Break;
              if i = FCols then Inc(DelLines);
            end;
            pr := pr + DelLines * DelLines;//DelLinesCoef;
            if Priority = pr then
            begin
              if r + GetMaxOfs(FOfs, an, diBottom) >
                DestRow + GetMaxOfs(FOfs, FDemoDestAngle, diBottom) then Dec(Priority)
              else if r - GetMaxOfs(FOfs, an, diTop) >
                DestRow - GetMaxOfs(FOfs, FDemoDestAngle, diTop) then Dec(Priority)
              else if (c - GetMaxOfs(FOfs, an, diLeft) = 0) or
                (c + GetMaxOfs(FOfs, an, diRight) = FCols - 1) then Dec(Priority);
            end;
            if (Priority < pr) then
            begin
              Priority := pr;
              FDemoDestAngle := an;
              FDemoDestCol := c;
              DestRow := r;
            end;
          end;
        end;
        an := an + 90;
        CheckAngle(an, FRotates);
      until an = 0;
    end;
    if Assigned(FOnCalcDemoDest) then
      FOnCalcDemoDest(Self, FDemoDestCol, DestRow, FDemoDestAngle);
  end;
end;

function TlfTetris.ChangeAnglePos(AAngle, ACol, ARow: Integer): word;
begin
  if (State <> tsPlay) and (State <> tsDemo) then
  begin
    Result := erNoGame;
    Exit;
  end;
  Result := erNoError;
  if Assigned(FOnChangeAnglePos) then
    FOnChangeAnglePos(Self, AAngle, ACol, ARow);
  if (FBlock.FAngle = AAngle) and
     (FBlock.FCol = ACol) and (FBlock.FRow = ARow) then Exit;
  Result := CheckBlockOfsAnglePos(FBlock.FOfs, AAngle, ACol, ARow);
  if Result = erNoError then
  begin
    SetNeedRepaint(True);
    FBlock.FAngle := AAngle;
    FBlock.FCol := ACol;
    FBlock.FRow := ARow;
    SetNeedRepaint(False);
    Repaint;
  end;
end;

function TlfTetris.ChangeBlock(NewBlock: TBlock): word;
begin
  if (State <> tsPlay) and (State <> tsDemo) then
  begin
    Result := erNoGame;
    Exit;
  end;
  with NewBlock do
  begin
    Result := CheckAngle(NewBlock.FAngle, NewBlock.FRotates);
    if Result <> erNoError then Exit;
    if FCol < 0 then FCol := FCols div 2;
    if FRow < 0 then FRow := GetMaxOfs(FOfs, FAngle, diTop);
    if Assigned(FOnChangeBlock) then FOnChangeBlock(Self, NewBlock);
    Result := CheckBlockOfsAnglePos(FOfs, FAngle, FCol, FRow);
    if Result <> erNoError then Exit;
    SetNeedRepaint(True);
    CopyOfs(FBlock.FOfs, FOfs);
    FBlock.FId := FId;
    FBlock.FColor := FColor;
    FBlock.FImageIndex := FImageIndex;
    FBlock.FAngle := FAngle;
    FBlock.FRotates := FRotates;
    FBlock.FCol := FCol;
    FBlock.FRow := FRow;
    FBlock.FPoints := FPoints;
    FBlock.FEmpty := False;
    SetNeedRepaint(False);
    Repaint;
  end;
end;

function TlfTetris.CheckAngle(var AAngle: Integer; Rotates: TBlockRotates): word;
begin
  Result := erNoError;
  if (AAngle = anRandom) then
    AAngle := Random(4) * 90
  else
  begin
    if (AAngle mod 90 <> 0) then AAngle := 0;
    if (AAngle < 0) then AAngle := (AAngle + 360);
    AAngle := AAngle mod 360;
  end;
  if Rotates = brNoRotate then AAngle := 0
  else if Rotates = br90 then AAngle := AAngle mod 180;
end;

function TlfTetris.CheckBlockOfsAnglePos(Ofs: TOfsArray;
  AAngle, ACol, ARow: Integer): word;
var
  i  : Integer;
begin
  Result := 0;
  if Length(Ofs) = 0 then
  begin
    Result := erNoSquares;
    Exit;
  end;
  for i := 0 to High(Ofs) do
  begin
    if (ACol + GetOffsetX(Ofs, i, AAngle) < 0) then
    begin
      Result := erOutOfLeft;
      Exit;
    end else
    if (ACol + GetOffsetX(Ofs, i, AAngle) > Cols - 1) then
    begin
      Result := erOutOfRight;
      Exit;
    end else
    if (ARow + GetOffsetY(Ofs, i, AAngle) < 0) then
    begin
      Result := erOutOfTop;
      Exit;
    end else
    if (ARow + GetOffsetY(Ofs, i, AAngle) > Rows - 1) then
    begin
      Result := erOutOfBottom;
      Exit;
    end else
    if (not Square[ACol + GetOffsetX(Ofs, i, AAngle),
                   ARow + GetOffsetY(Ofs, i, AAngle)].Empty) then
    begin
      Result := erOverBuried;
      Exit;
    end;
  end;
end;

function TlfTetris.CheckLine(ARow: Integer): Boolean;
var
  c : Integer;
begin
  Result := False;
  for c := 0 to FCols - 1 do
    if Square[c, ARow].Empty then Exit;
  Result := True;
end;

procedure TlfTetris.ClearField;
var
  i: Integer;
begin
  for i := 0 to High(FField) do
  begin
    FField[i].FEmpty := True;
    FField[i].FColor := BkgColor;
    FField[i].FImageIndex := -1;
    FField[i].FNeedRepaint := True;
  end;
end;

procedure TlfTetris.DeleteFullLines;
var
  r : Integer;
begin
  for r := 0 to FRows - 1 do
    if CheckLine(r) then DeleteLine(r);
end;

procedure TlfTetris.DeleteLine(ARow: Integer);
var
  c : Integer;
  NeedDelete : Boolean;
begin
  NeedDelete := True;
  if Assigned(FOnDeleteLine) then FOnDeleteLine(Self, ARow, NeedDelete);
  if NeedDelete then
    for c := 0 to FCols - 1 do DeleteSquare(c, ARow);
end;

procedure TlfTetris.DeleteSquare(ACol, ARow: Integer);
var
  r : Integer;
begin
  if (not (ARow in [0..FRows - 1])) or (not (ACol in [0..FCols - 1])) then Exit;
  for r := ARow downto 1 do
  begin
    FField[r * FCols + ACol].Assign(FField[(r - 1) * FCols + ACol]);
    if not FField[r * FCols + ACol].IsUnderBlock then
      FField[r * FCols + ACol].FNeedRepaint := True;
  end;
  FField[ACol].FEmpty := True;
  FField[ACol].FColor := BkgColor;
  FField[ACol].FImageIndex := -1;
  if not FField[ACol].IsUnderBlock then FField[ACol].FNeedRepaint := True;
end;

procedure TlfTetris.DoInvalidate;
var
  i : Integer;
begin
  for i := 0 to High(FField) do FField[i].NeedRepaint := true;
  Invalidate;
end;

procedure TlfTetris.DrawLines;
var
  r, c: Integer;
begin
  if not ((toHorzLines in FOptions) or (toVertLines in FOptions)) then Exit;
  with Canvas do
  begin
    Pen.Style := psSolid;
    Pen.Color := FLinesColor;
    if toHorzLines in Options then begin
      for r := 0 to FRows - 1 do
      begin
//        if r = FRows - 1 then Pen.Color := BkgColor;
        MoveTo(FWellWidth, (r + 1) * FSquareSizeY - 1);
        LineTo(FWellWidth + FSquareSizeX * FCols - 1, (r + 1) * FSquareSizeY - 1);
      end;
//      Pen.Color := FLinesColor;
    end;
    if toVertLines in Options then
    begin
      for c := 0 to FCols - 1 do
      begin
//        if c = FCols - 1 then Pen.Color := BkgColor;
        MoveTo(FWellWidth + (c + 1) * FSquareSizeX - 1, 0);
        LineTo(FWellWidth + (c + 1) * FSquareSizeX - 1, FSquareSizeY * FRows - 1);
      end;
    end;
  end;
end;

procedure TlfTetris.DrawWell;
begin
  if FWellWidth = 0 then Exit;
  with Canvas do
  begin
    Brush.Style := bsSolid;
    Brush.Color := FWellColor;
    FillRect(Bounds(FWellWidth, FSquareSizeY * FRows,
      FSquareSizeX * FCols, FWellWidth)); //bottom border of well
    FillRect(Bounds(0, 0, FWellWidth, FSquareSizeY * FRows + FWellWidth)); //left border of well
    FillRect(Bounds(FWellWidth + FSquareSizeX * FCols, 0,
      FWellWidth, FSquareSizeY * FRows + FWellWidth)); //right border of well
  end;
end;

procedure TlfTetris.DropDown;
begin
  if FBlock.FEmpty then Exit;
  if Assigned(FOnDropDown) then FOnDropDown(Self);
  if toFastDropDown in FOptions then FastDropDown
  else SetTimerInterval(FSpeedDropDown);
end;

procedure TlfTetris.EndDropDown;
begin
  SetTimerInterval(FSpeed);
end;

procedure TlfTetris.EndWayBlock;
begin
  BuryBlock;
  DeleteFullLines;
  NewBlock;
end;

procedure TlfTetris.FastDropDown;
var
  i : Integer;
begin
  if FBlock.FEmpty then Exit;
  with FBlock do
  if CheckBlockOfsAnglePos(FOfs, FAngle, FCol, FRow + 1) <> erNoError then
    EndWayBlock
  else
  begin
    i := 1;
    while CheckBlockOfsAnglePos(FOfs, FAngle, FCol, FRow + i) = erNoError do
      Inc(i);
    SetBlockPos(FCol, FRow + i - 1);
    if toMoveAfterDropDown in FOptions then FLastTickCount := GetTickCount
    else EndWayBlock;
  end;
end;

procedure TlfTetris.GameOver;
begin
  FBlock.Clear;
  if FState <> tsDemo then
  begin
    SetTimerInterval(0);
    FState := tsGameOver;
  end;
  if Assigned(FOnGameOver) then FOnGameOver(Self);
  if FState = tsDemo then StartGame(True)
  else Repaint;
end;

function TlfTetris.GetSquare(ACol, ARow: Integer): TTetFieldSquare;
begin
  Result := FField[ARow * FCols + ACol];
end;

procedure TlfTetris.ImageListChange(Sender: TObject);
begin
  if Sender = Images then UpdateImages;
end;

procedure TlfTetris.KeyDown(var Key: Word; Shift: TShiftState);
var
  sc : TShortCut;
begin
  inherited KeyDown(Key, Shift);
  sc := ShortCut(Key, Shift);
  if sc <> 0 then UnPauseGame;
  if sc = FKeyStartNewGame then
  begin
    StartGame;
    Exit;
  end;
  if (FState <> tsPlay) or FBlock.FEmpty then Exit;
  if sc = FKeyMoveLeft then SetBlockPos(FBlock.FCol - 1, FBlock.FRow)
  else if sc = FKeyMoveRight then SetBlockPos(FBlock.FCol + 1, FBlock.FRow)
  else if sc = FKeyRotate then RotateBlock
  else if sc = FKeyDropDown then DropDown
  else if sc = FKeyPause then PauseGame;
end;

procedure TlfTetris.KeyUp(var Key: Word; Shift: TShiftState);
begin
  inherited KeyUp(Key, Shift);
  if (FState <> tsPlay) or (FBlock.FEmpty) then Exit;
  if (ShortCut(Key, Shift) = FKeyDropDown) then EndDropDown;
end;

procedure TlfTetris.MouseDown(Button: TMouseButton; Shift: TShiftState;
  X, Y: Integer);
begin
  if TabStop and not (csDesigning in ComponentState) and
    (CanFocus or (GetParentForm(Self) = nil)) then
    SetFocus;
  if (Button = mbLeft) and (ssDouble in Shift) then DblClick
  else if Button = mbLeft then Click;
  inherited MouseDown(Button, Shift, X, Y);
end;

function TlfTetris.GetNextBlock: word;
var
  bd : TBlockDesc;
begin
  repeat
    Result := TetrisServer.GetBlock(Self, bd);
    if Result <> erNoError then Exit;
    if Assigned(FOnGetNextBlockDesc) then
      FOnGetNextBlockDesc(Self, bd);
  until Length(bd.FOfs) <> 0;
  with FNextBlock do
  begin
    Clear;
    FId := bd.Index;
    FColor := bd.FColor;
    CopyOfs(FOfs, bd.FOfs);
    FRotates := bd.FRotates;
    FImageIndex := bd.FImageIndex;
    FPoints := bd.FPoints;
    FEmpty := False;
  end;
  if Assigned(FOnGetNextBlock) then FOnGetNextBlock(Self);
end;

procedure TlfTetris.NewBlock;
var
  er : word;
begin
  er := erNoError;
  if not Assigned(TetrisServer) then er := erNoEnabledBlocks
  else begin
    if FNextBlock.FEmpty then er := GetNextBlock;
    if er = erNoError then
    begin
      er := ChangeBlock(FNextBlock);
      if er = erNoError then er := GetNextBlock;
    end;
  end;
  case er of
    erNoError : if FState = tsDemo then CalcDemoDest;
    erNoEnabledBlocks :
      begin
        FOptions := FOptions - [toDemoOnWait];
        WaitGame;
      end;
    else GameOver;
  end;
end;

procedure TlfTetris.Notification(AComponent: TComponent; Operation: TOperation);
begin
  inherited Notification(AComponent, Operation);
  if Operation = opRemove then
  begin
    if AComponent = Images then Images := nil
    else if AComponent = TetrisServer then TetrisServer := nil;
  end;
end;

procedure TlfTetris.Paint;
var
  r, c: Integer;
begin
  Canvas.Font := Font;
  with Canvas do
  begin
    Brush.Color := BkgColor;
{    if csDesigning in ComponentState then
    begin
      Pen.Style := psDash;
      Brush.Style := bsClear;
      Rectangle(0, 0, Width, Height);
    end;}
    DrawWell;
    DrawLines;
    for r := 0 to FRows - 1 do
      for c := 0 to FCols - 1 do
        if Square[c, r].FNeedRepaint then
          Square[c, r].Draw(Canvas,
            FWellWidth + c * FSquareSizeX, r * FSquareSizeY);
    if (State = tsDemo) or (State = tsPlay)  or (State = tsPause) then
      FBlock.Draw(Canvas, FWellWidth + FBlock.FCol * FSquareSizeX, FBlock.FRow * FSquareSizeY);
    if State = tsGameOver then WriteTextOnField(FStrGameOver);
  end;
end;

procedure TlfTetris.PauseGame;
begin
  if FState = tsPlay then FState := tsPause;
end;

function TlfTetris.RotateBlock: word;
var
  an     : Integer;
begin
  Result := erNoError;
  with FBlock do
  begin
    if FEmpty then Exit;
    if toRotateClockwise in Options then an := FAngle - 90
    else an := FAngle + 90;
    Result := CheckAngle(an, FRotates);
    if Result <> erNoError then Exit;
    Result := CheckBlockOfsAnglePos(FOfs, an, FCol, FRow);
    if Result = erNoError then ChangeAnglePos(an, FCol, FRow)
    else if (Result <> erNoError) and (toRotateNearWall in Options) then
      case Result of
        erOutOfRight : Result := ChangeAnglePos(an, FCols - GetMaxOfs(FOfs, an, diRight) - 1, FRow);
        erOutOfTop : Result := ChangeAnglePos(an, FCol, GetMaxOfs(FOfs, an, diTop));
        erOutOfLeft : Result := ChangeAnglePos(an, GetMaxOfs(FOfs, an, diLeft), FRow);
      end;
  end;
end;

procedure TlfTetris.SetBkgBitmap(Value: TBitmap);
begin
  BkgBitmap.Assign(Value);
end;

procedure TlfTetris.SetBkgColor(Value: TColor);
begin
  if FBkgColor = Value then Exit;
  FBkgColor := Value;
  DoInvalidate;
end;

function TlfTetris.SetBlockPos(ACol, ARow: Integer): word;
begin
  Result := ChangeAnglePos(FBlock.FAngle, ACol, ARow);
end;

procedure TlfTetris.SetBorderStyle(Value: TBorderStyle);
begin
  if FBorderStyle <> Value then
  begin
    FBorderStyle := Value;
    RecreateWnd;
  end;
end;

procedure TlfTetris.SetCols(Value: Integer);
begin
  UpdateField(Value, FRows, FSquareSizeX, FSquareSizeY);
end;

procedure TlfTetris.SetImages(Value: TCustomImageList);
begin
  if FImages <> nil then FImages.UnRegisterChanges(FImageChangeLink);
  FImages := Value;
  if FImages <> nil then
  begin
    FImages.RegisterChanges(FImageChangeLink);
    FImages.FreeNotification(Self);
    UpdateImages;
  end;
  DoInvalidate;
end;

procedure TlfTetris.SetLinesColor(Value: TColor);
begin
  if Value <> FLinesColor then
  begin
    FLinesColor := Value;
    Repaint;
  end;
end;

procedure TlfTetris.SetNeedRepaint(IsNeed: boolean);
var
  i : Integer;
begin
  with FBlock do
  begin
    if FEmpty or (FCol < 0) or (FRow < 0) then Exit;
    for i := 0 to High(FOfs) do
      Square[OfsCol[i], OfsRow[i]].NeedRepaint := IsNeed;
  end;
end;

procedure TlfTetris.SetOptions(Value: TTetrisOptions);
var
  ChangedOptions: TTetrisOptions;
begin
  if (FOptions = Value) then Exit;
  ChangedOptions := (FOptions + Value) - FOptions * Value;
  FOptions := Value;
  if (toHorzLines in ChangedOptions) or (toVertLines in ChangedOptions) or
     (toTruncSquare in ChangedOptions) then
  begin
    UpdateImages;
    DoInvalidate;
  end else
  if toDemoOnWait in ChangedOptions then
  begin
    if toDemoOnWait in FOptions then
    begin
      if FState = tsWaitGame then StartDemo;
    end
    else if FState = tsDemo then WaitGame;
  end;
end;

procedure TlfTetris.SetRows(Value: Integer);
begin
  UpdateField(FCols, Value, FSquareSizeX, FSquareSizeY);
end;

procedure TlfTetris.SetSquareSizeX(Value: Integer);
begin
  UpdateField(FCols, FRows, Value, FSquareSizeY);
end;

procedure TlfTetris.SetSquareSizeY(Value: Integer);
begin
  UpdateField(FCols, FRows, FSquareSizeX, Value);
end;

procedure TlfTetris.SetSpeed(Value: Cardinal);
begin
  if Value = FSpeed then Exit;
  if Value < 3 then Value := 3;
  if (FTimerInterval <> 0) and (FTimerInterval <> FSpeedDropDown) then
    SetTimerInterval(Value);
  FSpeed := Value;
end;

procedure TlfTetris.SetStrGameOver(Value: TStrings);
begin
  FStrGameOver.Assign(Value);
end;

procedure TlfTetris.SetTetrisServer(Value: TlfTetrisServer);
begin
  if FTetrisServer = Value then Exit;
  if Assigned(FTetrisServer) then FTetrisServer.DeleteTetris(Self);
  FTetrisServer := Value;
  if Assigned(FTetrisServer) then FTetrisServer.AddTetris(Self);
  WaitGame;
end;

procedure TlfTetris.SetTimerInterval(Value: Cardinal);
begin
  FTimerInterval := Value;
  FLastTickCount := GetTickCount;
end;

procedure TlfTetris.SetWellColor(Value: TColor);
begin
  if Value <> FWellColor then
  begin
    FWellColor := Value;
    Repaint;
  end;
end;

procedure TlfTetris.SetWellWidth(Value: Word);
begin
  if Value <> FWellWidth then
  begin
    FWellWidth := Value;
    UpdateField(FCols, FRows, FSquareSizeX, FSquareSizeY);
  end;
end;

procedure TlfTetris.StartDemo;
begin
  StartGame(True);
end;

procedure TlfTetris.StartGame(Demo: boolean = False);
begin
  ClearField;
  FState := tsWaitGame;
  DoInvalidate;
  if not Assigned(TetrisServer) then Exit;
  FNextBlock.Clear;
  FBlock.Clear;
  if Demo then FState := tsDemo
  else FState := tsPlay;
  SetTimerInterval(FSpeed);
  if not (csLoading in ComponentState) then
    if Assigned(FOnStartGame) then FOnStartGame(Self, Demo);
  NewBlock;
end;

procedure TlfTetris.TimerExpired;
var
  tc : Cardinal;
begin
  if FTimerInterval < 1 then Exit;
  tc := GetTickCount;
  if tc - FLastTickCount < FTimerInterval then Exit;
  FLastTickCount := tc;
  with FBlock do
  begin
    if FEmpty or (FState = tsPause) then Exit;
    if SetBlockPos(FCol, FRow + 1) <> erNoError  then
    begin
      EndWayBlock;
      Exit;
    end;
    if FState = tsDemo then
    begin
      if FAngle <> FDemoDestAngle then RotateBlock
      else if FCol > FDemoDestCol then SetBlockPos(FCol - 1, FRow)
      else if FCol < FDemoDestCol then SetBlockPos(FCol + 1, FRow)
      else DropDown;
    end;
  end;
end;

procedure TlfTetris.UpdateField(ACols, ARows, ASquareSizeX, ASquareSizeY: Integer);
var
  r, c      : Integer;
  xb, yb    : Integer;
begin
  if (ARows <> FRows) or (ACols <> FCols) then
  begin
    if (ARows < 5) or (ACols < 5) then Exit;
    if FState = tsDemo then
    begin
      if toDemoOnWait in FOptions then SetOptions(FOptions - [toDemoOnWait]);
      WaitGame;
    end;
    if (FState <> tsWaitGame) and (FState <> tsGameOver) then Exit;
    FState := tsWaitGame;
    for r := 0 to High(FField) do FField[r].Free;
    FRows := ARows;
    FCols := ACols;
    SetLength(FField, FRows * FCols);
    for r := 0 to FRows-1 do
      for c := 0 to FCols-1 do
      begin
        FField[r * FCols + c] := TTetFieldSquare.Create(c, r);
        FField[r * FCols + c].FTetris := Self;
      end;
    ClearField;
  end;
  FSquareSizeX := Max(ASquareSizeX, 3);
  FSquareSizeY := Max(ASquareSizeY, 3);
  if BorderStyle = bsNone then
  begin
    xb := 0;
    yb := 0;
  end else
  begin
    xb := GetSystemMetrics(SM_CXBORDER) * (2 + 2 * Integer(Ctl3D));
    yb := GetSystemMetrics(SM_CYBORDER) * (2 + 2 * Integer(Ctl3D));
  end;
  BoundsRect := Bounds(Left, Top, 2 * FWellWidth + FCols * FSquareSizeX + xb,
     FWellWidth + FRows * FSquareSizeY + yb);
  UpdateImages;
  DoInvalidate;
end;

procedure TlfTetris.UnPauseGame;
begin
  if FState = tsPause then FState := tsPlay;
end;

procedure TlfTetris.UpdateImages;
begin
{  if Assigned(Images) then
  begin
    if Images.Width  <> FSquareSizeX - byte(toVertLines in FOptions) then
      Images.Width   := FSquareSizeX - byte(toVertLines in FOptions);
    if Images.Height <> FSquareSizeY - byte(toHorzLines in FOptions) then
      Images.Height  := FSquareSizeX - byte(toHorzLines in FOptions);
  end;}
end;

procedure TlfTetris.WaitGame;
begin
  FBlock.FEmpty := True;
  FNextBlock.FEmpty := True;
  ClearField;
  SetTimerInterval(0);
  FState := tsWaitGame;
  if Assigned(FOnWaitGame) then FOnWaitGame(Self);
  DoInvalidate;
  if toDemoOnWait in FOptions then StartDemo;
end;

procedure TlfTetris.WriteTextOnField(Strings: TStrings);
var
  i, h : Integer;
  BegH : Integer;
begin
  with Canvas do
  begin
    Brush.Style := bsClear;
    BegH := 0;
    for i := 0 to Strings.Count - 1 do BegH := BegH + TextHeight(Strings[i]);
    BegH := (Height - BegH) div 2;
    h := 0;
    for i := 0 to Strings.Count - 1 do
    begin
      TextOut((Width - TextWidth(Strings[i])) div 2, BegH + h, Strings[i]);
      h := h + TextHeight(Strings[i]);
    end;
  end;
end;

{ TTetDesc }

constructor TTetDesc.Create(ATetris: TlfTetris);
begin
  inherited Create;
  FTetris := ATetris;
  FNBlock := -1;
  FInGame := False;
end;

{ TlfTetrisServer }

constructor TlfTetrisServer.Create(AOwner: TComponent);
begin
  inherited Create(AOwner);
  FTetrises := TObjectList.Create(False);
  FBlockDescs := CreateBlockDescs;
  FNLead := -1;
  FKind := tskLocal;
  FOptions := [tsoSameBlocksForAll];
  FTimer := TTimer.Create(Self);
  FTimer.Enabled := True;
  FTimer.Interval := 10;
  FTimer.OnTimer := TimerFired;
end;

destructor TlfTetrisServer.Destroy;
begin
  if Assigned(FCSSocket) then FCSSocket.Free;
  FTimer.Free;
  FBlockDescs.Free;
  FreeAndNil(FTetrises);
  inherited Destroy;
end;

procedure TlfTetrisServer.AddTetris(ATetris: TlfTetris);
begin
  FTetrises.Add(TTetDesc.Create(ATetris));
  if Assigned(FOnAddTetris) then FOnAddTetris(Self, ATetris);
end;

procedure TlfTetrisServer.DeleteTetris(ATetris: TlfTetris);
begin
  if Assigned(FTetrises) then
    FTetrises.Delete(GetNByTetris(ATetris));
  if Assigned(FOnDeleteTetris) then
    FOnDeleteTetris(Self, ATetris);
end;

procedure TlfTetrisServer.TimerFired;
var
  i : Integer;
begin
  for i := 0 to FTetrises.Count - 1 do
    TTetDesc(FTetrises.Items[i]).FTetris.TimerExpired;
end;

procedure TlfTetrisServer.StartGame;
var
  i : Integer;
  MsgCode : Word;
begin
  if FKind = tskRemote then
    with ServerSocket.Socket do
    begin
      MsgCode := mcStartGame;
      for i := 0 to ActiveConnections - 1 do
        Connections[i].SendBuf(MsgCode, SizeOf(MsgCode));
    end;
  FNLead := -1;
  for i := 0 to FTetrises.Count - 1 do
    with FTetrises[i] as TTetDesc do
    begin
      FInGame := True;
      FNBlock := -1;
      FTetris.StartGame;
    end;
end;

function TlfTetrisServer.GetNByTetris(ATetris: TlfTetris): Integer;
var
  i : Integer;
begin
  for i := 0 to FTetrises.Count - 1 do
    if TTetDesc(FTetrises[i]).FTetris = ATetris then
    begin
      Result := i;
      Exit;
    end;
  Result := -1;
end;

function TlfTetrisServer.CreateBlockDescs: TBlockDescs;
begin
  Result := TBlockDescs.Create(Self, TBlockDesc);
end;

procedure TlfTetrisServer.SetBlockDescs(Value: TBlockDescs);
begin
  BlockDescs.Assign(Value);
end;

function TlfTetrisServer.CheckBlockId(var BlockId: Integer): word;
var
  i : Integer;
  Prob, SumProb : Integer;
begin
  Result := erNoError;
  with FBlockDescs do
  begin
    if (BlockId <> biRandom) and
      ((not BlockId in [0..Count-1]) or (not Items[BlockId].FEnabled)) then
    begin
      Result := erBlockIdNotAllowed;
      Exit;
    end;
    if BlockId = biRandom then
    begin
      if not FBlockDescs.Check then
      begin
        Result := erNoEnabledBlocks;
        Exit;
      end;
      SumProb := 0;
      for i := 0 to Count - 1 do
        if Items[i].FEnabled then SumProb := SumProb + Items[i].Probability;
      Prob := Random(SumProb) + 1;
      for i := 0 to Count - 1 do
      begin
        if Items[i].FEnabled then Prob := Prob - Items[i].Probability;
        if Prob <= 0 then Break;
      end;
      BlockId := i;
    end;
  end;
end;

function TlfTetrisServer.GetBlock(ATetris: TlfTetris; var BlockDesc: TBlockDesc;
  BlockId: Integer = biRandom): word;
var
  NTetris : Integer;
begin
  Result := CheckBlockId(BlockId);
  if Result <> erNoError then Exit;
  BlockDesc := FBlockDescs[BlockId];
  if not (tsoSameBlocksForAll in FOptions) then Exit;
  NTetris := GetNByTetris(ATetris);
  with FTetrises[NTetris] as TTetDesc do
  begin
    if not FInGame then Exit;
    Inc(FNBlock);
    if FNLead + 1 = FNBlock then
    begin
      Inc(FNLead);
      if FNLead = BlockBufLen then
      begin
        FNLead := 0;
        FNBlock := 0;
      end;
      FBlockBuf[FNLead] := BlockId;
    end
    else if FNBlock = BlockBufLen then FNBlock := 0;
    BlockDesc := FBlockDescs[FBlockBuf[FNBlock]];
  end;
end;

function TlfTetrisServer.ServerSocket: TServerSocket;
begin
  Result := FCSSocket as TServerSocket;
end;

function TlfTetrisServer.ClientSocket: TClientSocket;
begin
  Result := FCSSocket as TClientSocket;
end;

function TlfTetrisServer.GetActive: Boolean;
begin
  Result := True;
  case FKind of
    tskRemote : Result := ServerSocket.Active;
    tskClient : Result := ClientSocket.Active;
  end;
end;

procedure TlfTetrisServer.SetActive(Value: Boolean);
begin
  case FKind of
    tskRemote : ServerSocket.Active := Value;
    tskClient : ClientSocket.Active := Value;
  end;
end;

function TlfTetrisServer.GetPort: Integer;
begin
  Result := 0;
  case FKind of
    tskRemote : Result := ServerSocket.Port;
    tskClient : Result := ClientSocket.Port;
  end;
end;

procedure TlfTetrisServer.SetPort(Value: Integer);
begin
  case FKind of
    tskRemote : ServerSocket.Port := Value;
    tskClient : ClientSocket.Port := Value;
  end;
end;

function TlfTetrisServer.GetService: string;
begin
  case FKind of
    tskLocal  : Result := '';
    tskRemote : Result := ServerSocket.Service;
    tskClient : Result := ClientSocket.Service;
  end;
end;

procedure TlfTetrisServer.SetService(Value: string);
begin
  case FKind of
    tskRemote : ServerSocket.Service := Value;
    tskClient : ClientSocket.Service := Value;
  end;
end;

function TlfTetrisServer.GetServerType: TServerType;
begin
  if FKind = tskRemote then Result := ServerSocket.ServerType
  else Result := stNonBlocking;
end;

procedure TlfTetrisServer.SetServerType(Value: TServerType);
begin
  if FKind = tskRemote then ServerSocket.ServerType := Value;
end;

function TlfTetrisServer.GetThreadCacheSize: Integer;
begin
  if FKind = tskRemote then Result := ServerSocket.ThreadCacheSize
  else Result := 10;
end;

procedure TlfTetrisServer.SetThreadCacheSize(Value: Integer);
begin
  if FKind = tskRemote then ServerSocket.ThreadCacheSize := Value;
end;

function TlfTetrisServer.GetAddress: string;
begin
  if FKind = tskClient then Result := ClientSocket.Address
  else Result := '';
end;

procedure TlfTetrisServer.SetAddress(Value: string);
begin
  if FKind = tskClient then ClientSocket.Address := Value;
end;

function TlfTetrisServer.GetHost: string;
begin
  if FKind = tskClient then Result := ClientSocket.Host
  else Result := '';
end;

procedure TlfTetrisServer.SetHost(Value: string);
begin
  if FKind = tskClient then ClientSocket.Host := Value;
end;

function TlfTetrisServer.GetClientType: TClientType;
begin
  if FKind = tskClient then Result := ClientSocket.ClientType
  else Result := ctNonBlocking;
end;

procedure TlfTetrisServer.SetClientType(Value: TClientType);
begin
  if FKind = tskClient then ClientSocket.ClientType := Value;
end;

procedure TlfTetrisServer.SetKind(Value: TTetrisServerKind);
begin
  if FKind = Value then Exit;
  if Assigned(FCSSocket) then FCSSocket.Free;
  FKind := Value;
  case FKind of
    tskLocal  : FCSSocket := nil;
    tskRemote :
    begin
      FCSSocket := TServerSocket.Create(Self);
      with FCSSocket as TServerSocket do
      begin
        OnAccept := ServerAccept;
        OnClientConnect := CSConnect;
        OnClientDisconnect := CSDisconnect;
        OnClientError := CSError;
        OnClientRead := CSRead;
        OnClientWrite := CSWrite;
        OnListen := ServerListen;
      end;
    end;
    tskClient :
    begin
      FCSSocket := TClientSocket.Create(Self);
      with FCSSocket as TClientSocket do
      begin
        OnConnect := CSConnect;
        OnConnecting := ClientConnecting;
        OnDisconnect := CSDisconnect;
        OnError := CSError;
        OnLookup := ClientLookup;
        OnRead := CSRead;
        OnWrite := CSWrite;
      end;
    end;
  end;
end;

procedure TlfTetrisServer.ServerAccept(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnServerAccept) then FOnServerAccept(Sender, Socket);
end;

procedure TlfTetrisServer.CSConnect(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnCSConnect) then FOnCSConnect(Sender, Socket);
end;

procedure TlfTetrisServer.ClientConnecting(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnClientConnecting) then
    FOnClientConnecting(Sender, Socket);
end;

procedure TlfTetrisServer.CSDisconnect(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnCSDisconnect) then FOnCSDisconnect(Sender, Socket);
end;

procedure TlfTetrisServer.CSError(Sender: TObject; Socket: TCustomWinSocket;
  ErrorEvent: TErrorEvent; var ErrorCode: Integer);
begin
  if Assigned(FOnCSError) then
    FOnCSError(Sender, Socket, ErrorEvent, ErrorCode);
end;

procedure TlfTetrisServer.CSRead(Sender: TObject; Socket: TCustomWinSocket);
var
  BufLen: Integer;
  Buf: PChar;
  MsgCode: Byte;
begin
  case FKind of
    tskRemote :
      with ServerSocket.Socket do
      begin
        BufLen := ReceiveLength;
        GetMem(Buf, BufLen);
        try
          ReceiveBuf(Buf^, BufLen);
{          MsgCode := Word(Buf^);
          case MsgCode of
          end;}
        finally
          FreeMem(Buf);
        end;
      end;
    tskClient :
      with ClientSocket.Socket do
      begin
        BufLen := ReceiveLength;
        GetMem(Buf, BufLen);
        try
          ReceiveBuf(Buf^, BufLen);
          MsgCode := Word(Buf^);
          case MsgCode of
            mcStartGame : StartGame;
          end;
        finally
          FreeMem(Buf);
        end;
      end;
  end;
  if Assigned(FOnCSRead) then FOnCSRead(Sender, Socket);
end;

procedure TlfTetrisServer.CSWrite(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnCSWrite) then FOnCSWrite(Sender, Socket);
end;

procedure TlfTetrisServer.ServerListen(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnServerListen) then FOnServerListen(Sender, Socket);
end;

procedure TlfTetrisServer.ClientLookup(Sender: TObject; Socket: TCustomWinSocket);
begin
  if Assigned(FOnClientLookup) then FOnClientLookup(Sender, Socket);
end;

end.

