// eslint-disable-next-line react/prop-types
const StatusMessage = ({ title, body, children }) => (
  <div className="mt-16 max-w-lg">
    {title ? <h1 className="text-2xl font-bold">{title}</h1> : null}
    {body ? <p className="mt-3 text-[#a7a7a7]">{body}</p> : null}
    {children}
  </div>
)

export default StatusMessage
