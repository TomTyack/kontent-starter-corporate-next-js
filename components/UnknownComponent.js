function UnknownComponent(props) {
  if (props.useLayout) {
    return (
        <div>
          <h2>UNKNOWN COMPONENT</h2>
          {props.children}
        </div>
    );
  }

  return (
    <div>
      <h2>UNKNOWN COMPONENT</h2>
      {props.children}
    </div>
  );
}

export default UnknownComponent;