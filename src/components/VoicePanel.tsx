import { Mic, Send, Volume2 } from 'lucide-react'

const quickCommands = ['查看今天安排', '明天下午三点项目会', '播报本周日程']

export function VoicePanel() {
  return (
    <section className="voice-panel" aria-labelledby="voice-panel-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Voice Input</p>
          <h2 id="voice-panel-title">语音指令</h2>
        </div>
        <button className="icon-button" type="button" aria-label="播报当前回复">
          <Volume2 size={18} strokeWidth={2.2} />
        </button>
      </div>

      <button className="voice-control-button" type="button" aria-label="开始语音输入">
        <Mic size={34} strokeWidth={2.1} />
      </button>

      <div className="transcript-box">
        <span className="transcript-label">识别文本</span>
        <p>等待语音输入</p>
      </div>

      <div className="command-row" aria-label="常用指令">
        {quickCommands.map((command) => (
          <button className="command-chip" type="button" key={command}>
            {command}
          </button>
        ))}
      </div>

      <div className="input-row">
        <input aria-label="文本指令" placeholder="输入一条日程指令" />
        <button className="primary-icon-button" type="button" aria-label="发送文本指令">
          <Send size={18} strokeWidth={2.4} />
        </button>
      </div>
    </section>
  )
}
